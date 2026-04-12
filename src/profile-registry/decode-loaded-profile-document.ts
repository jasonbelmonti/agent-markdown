import type { AffordanceActionability, AffordanceRole } from "../core-model/affordances.ts";
import type {
  AgentMarkdownDocSpec,
  LoadedProfileDocument,
  MvpDocKind,
  MvpProfileId,
  ProfileBodyContract,
  ProfileDiscovery,
  ProfileMetadataContract,
  ProfileMetadataField,
  ProfileMetadataValueType,
  ProfileValidationRules,
  RawProfileSource,
} from "../core-model/profiles.ts";
import {
  readOptionalBoolean,
  readOptionalString,
  readOptionalStringArray,
  readRecord,
  readRequiredBoolean,
  readRequiredString,
  readStringArray,
} from "./frontmatter-readers.ts";
import {
  getExpectedDocKind,
  isAgentMarkdownDocSpec,
  isMvpDocKind,
  isMvpProfileId,
} from "./profile-identity.ts";

const metadataValueTypes = ["string", "string_array", "date"] as const satisfies
  readonly ProfileMetadataValueType[];
const affordanceRoles = [
  "work",
  "coordination",
  "context",
  "policy",
  "capability",
] as const satisfies readonly AffordanceRole[];
const affordanceActionability = ["reference", "plan", "execute"] as const satisfies
  readonly AffordanceActionability[];

export function decodeLoadedProfileDocument(
  source: RawProfileSource,
): LoadedProfileDocument {
  const profileId = readProfileId(source.rawFrontmatter, source.path);
  const docSpec = readDocSpec(source.rawFrontmatter, source.path);
  const docKind = readDocKind(source.rawFrontmatter, source.path, profileId);
  const title = readRequiredString(source.rawFrontmatter, "title", source.path);
  const discovery = readDiscovery(source.rawFrontmatter, source.path);
  const metadata = readMetadataContract(source.rawFrontmatter, source.path);
  const body = readBodyContract(source.rawFrontmatter, source.path);
  const validation = readValidationRules(
    source.rawFrontmatter,
    source.path,
    docSpec,
    docKind,
  );
  const affordances = readAffordances(source.rawFrontmatter, source.path);

  return {
    source,
    profile_id: profileId,
    doc_spec: docSpec,
    doc_kind: docKind,
    title,
    discovery,
    metadata,
    body,
    validation,
    affordances,
  } as LoadedProfileDocument;
}

function readProfileId(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): MvpProfileId {
  const profileId = readRequiredString(frontmatter, "profile_id", sourcePath);

  if (!isMvpProfileId(profileId)) {
    throw new Error(
      `Profile document "${sourcePath}" declares unsupported profile_id "${profileId}".`,
    );
  }

  return profileId;
}

function readDocSpec(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): AgentMarkdownDocSpec {
  const docSpec = readRequiredString(frontmatter, "doc_spec", sourcePath);

  if (!isAgentMarkdownDocSpec(docSpec)) {
    throw new Error(
      `Profile document "${sourcePath}" declares unsupported doc_spec "${docSpec}".`,
    );
  }

  return docSpec;
}

function readDocKind(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
  profileId: MvpProfileId,
): MvpDocKind {
  const docKind = readRequiredString(frontmatter, "doc_kind", sourcePath);

  if (!isMvpDocKind(docKind)) {
    throw new Error(
      `Profile document "${sourcePath}" declares unsupported doc_kind "${docKind}".`,
    );
  }

  const expectedDocKind = getExpectedDocKind(profileId);

  if (docKind !== expectedDocKind) {
    throw new Error(
      `Profile document "${sourcePath}" declares doc_kind "${docKind}" but profile_id "${profileId}" requires "${expectedDocKind}".`,
    );
  }

  return docKind;
}

function readDiscovery(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): ProfileDiscovery {
  const discovery = readRecord(frontmatter, "discovery", sourcePath);

  return {
    filenames: readStringArray(discovery, "filenames", sourcePath),
    globs: readStringArray(discovery, "globs", sourcePath),
  };
}

function readMetadataContract(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): ProfileMetadataContract {
  const metadata = readRecord(frontmatter, "metadata", sourcePath);

  return {
    required: readMetadataFields(metadata, "required", sourcePath),
    optional: readMetadataFields(metadata, "optional", sourcePath),
  };
}

function readMetadataFields(
  metadata: Record<string, unknown>,
  key: "required" | "optional",
  sourcePath: string,
): ProfileMetadataField[] {
  const value = metadata[key];

  if (!Array.isArray(value)) {
    throw new Error(
      `Profile document "${sourcePath}" field "metadata.${key}" must be an array.`,
    );
  }

  return value.map((item, index) =>
    readMetadataField(item, `metadata.${key}[${index}]`, sourcePath),
  );
}

function readMetadataField(
  value: unknown,
  fieldPath: string,
  sourcePath: string,
): ProfileMetadataField {
  const field = readRecord({ [fieldPath]: value }, fieldPath, sourcePath);
  const name = readRequiredString(field, "name", sourcePath, fieldPath);
  const type = readMetadataValueType(field, sourcePath, `${fieldPath}.type`);
  const description = readOptionalString(field, "description", sourcePath, fieldPath);
  const enumValues = readOptionalStringArray(field, "enum", sourcePath, fieldPath);

  return {
    name,
    type,
    ...(description === undefined ? {} : { description }),
    ...(enumValues === undefined ? {} : { enum: enumValues }),
  };
}

function readMetadataValueType(
  field: Record<string, unknown>,
  sourcePath: string,
  fieldPath: string,
): ProfileMetadataValueType {
  const value = readRequiredString(field, "type", sourcePath, fieldPath);

  if (!metadataValueTypes.includes(value as ProfileMetadataValueType)) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be one of ${metadataValueTypes.join(", ")}.`,
    );
  }

  return value as ProfileMetadataValueType;
}

function readBodyContract(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): ProfileBodyContract {
  const body = readRecord(frontmatter, "body", sourcePath);

  return {
    required_sections: readStringArray(body, "required_sections", sourcePath),
    optional_sections: readStringArray(body, "optional_sections", sourcePath),
  };
}

function readValidationRules(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
  docSpec: AgentMarkdownDocSpec,
  docKind: MvpDocKind,
): ProfileValidationRules<AgentMarkdownDocSpec, MvpDocKind> {
  const validation = readRecord(frontmatter, "validation", sourcePath);
  const requiredDocSpec = readDeclaredDocSpec(
    validation,
    sourcePath,
    "validation.require_declared_doc_spec",
  );
  const requiredDocKind = readDeclaredDocKind(
    validation,
    sourcePath,
    "validation.require_declared_doc_kind",
  );
  const requireRequiredSections = readRequiredBoolean(
    validation,
    "require_required_sections",
    sourcePath,
    "validation.require_required_sections",
  );
  const requireNonemptySections = readOptionalStringArray(
    validation,
    "require_nonempty_sections",
    sourcePath,
    "validation",
  );
  const requireChecklist = readOptionalBoolean(
    validation,
    "require_checklist_in_success_criteria",
    sourcePath,
    "validation.require_checklist_in_success_criteria",
  );

  if (requiredDocSpec !== docSpec) {
    throw new Error(
      `Profile document "${sourcePath}" validation.require_declared_doc_spec must match doc_spec "${docSpec}".`,
    );
  }

  if (requiredDocKind !== docKind) {
    throw new Error(
      `Profile document "${sourcePath}" validation.require_declared_doc_kind must match doc_kind "${docKind}".`,
    );
  }

  return {
    require_declared_doc_spec: requiredDocSpec,
    require_declared_doc_kind: requiredDocKind,
    require_required_sections: requireRequiredSections,
    ...(requireNonemptySections === undefined
      ? {}
      : { require_nonempty_sections: requireNonemptySections }),
    ...(requireChecklist === undefined
      ? {}
      : { require_checklist_in_success_criteria: requireChecklist }),
  };
}

function readDeclaredDocSpec(
  record: Record<string, unknown>,
  sourcePath: string,
  fieldPath: string,
): AgentMarkdownDocSpec {
  const value = readRequiredString(
    record,
    "require_declared_doc_spec",
    sourcePath,
    "validation",
  );

  if (!isAgentMarkdownDocSpec(value)) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be "agent-markdown/0.1".`,
    );
  }

  return value;
}

function readDeclaredDocKind(
  record: Record<string, unknown>,
  sourcePath: string,
  fieldPath: string,
): MvpDocKind {
  const value = readRequiredString(
    record,
    "require_declared_doc_kind",
    sourcePath,
    "validation",
  );

  if (!isMvpDocKind(value)) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must declare a supported doc kind.`,
    );
  }

  return value;
}

function readAffordances(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
) {
  const affordances = readRecord(frontmatter, "affordances", sourcePath);
  const role = readRequiredString(affordances, "role", sourcePath);
  const actionability = readRequiredString(
    affordances,
    "actionability",
    sourcePath,
  );

  if (!affordanceRoles.includes(role as AffordanceRole)) {
    throw new Error(
      `Profile document "${sourcePath}" field "affordances.role" must be one of ${affordanceRoles.join(", ")}.`,
    );
  }

  if (!affordanceActionability.includes(actionability as AffordanceActionability)) {
    throw new Error(
      `Profile document "${sourcePath}" field "affordances.actionability" must be one of ${affordanceActionability.join(", ")}.`,
    );
  }

  return {
    role: role as AffordanceRole,
    actionability: actionability as AffordanceActionability,
    normative_sections: readStringArray(
      affordances,
      "normative_sections",
      sourcePath,
    ),
  };
}
