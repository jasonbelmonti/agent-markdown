import type { NormalizedDocument } from "../core-model/documents.ts";
import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";
import type { DiscoveredDocumentDeclaration } from "../document-discovery/declaration-types.ts";
import type { ParsedMarkdownBody } from "../markdown-body/types.ts";

import { createNormalizedValidation } from "./create-normalized-validation.ts";
import { normalizeProfileMetadata } from "./normalize-profile-metadata.ts";
import { projectNormalizedAffordances } from "./project-normalized-affordances.ts";

export interface ComposeNormalizedDocumentOptions {
  discoveredDocument: DiscoveredDocumentDeclaration;
  profileResolution: ProfileResolutionResult;
  parsedBody: ParsedMarkdownBody;
  contentHash?: string;
  extensions?: Record<string, unknown>;
}

export function composeNormalizedDocument(
  options: ComposeNormalizedDocumentOptions,
): NormalizedDocument {
  const {
    discoveredDocument,
    profileResolution,
    parsedBody,
    contentHash = "",
    extensions = {},
  } = options;
  const { source, declaration } = discoveredDocument;
  const validation = createNormalizedValidation(profileResolution);

  return {
    source: {
      path: source.path,
      contentHash,
      discoveryMatches: [...source.discoveryMatches],
      rawFrontmatter: { ...source.rawFrontmatter },
      rawBodyMarkdown: source.rawBodyMarkdown,
    },
    declaration: {
      ...declaration,
    },
    profile: {
      resolved: profileResolution.resolved,
      profileId: profileResolution.profile_id,
      profilePath: profileResolution.profile_path,
    },
    metadata: normalizeProfileMetadata(profileResolution.profile, source.rawFrontmatter),
    body: {
      sections: cloneSections(parsedBody),
    },
    validation,
    affordances: projectNormalizedAffordances(
      profileResolution,
      validation.conformance,
    ),
    extensions: { ...extensions },
  };
}

function cloneSections(parsedBody: ParsedMarkdownBody): ParsedMarkdownBody["sections"] {
  return parsedBody.sections.map((section) => ({
    ...section,
    headingPath: [...section.headingPath],
  }));
}
