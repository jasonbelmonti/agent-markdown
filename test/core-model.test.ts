import { expect, test } from "bun:test";

import type {
  LoadedProfileDocument,
  NormalizedDocument,
  NormalizedValidation,
  ProfileLookupReference,
  ProfileResolutionResult,
  ProjectedAffordances,
} from "../index.ts";

const agentMarkdownSpec = "agent-markdown/0.1" as const;
const taskDocKind = "task" as const;
const taskProfileId = "task/basic@v1" as const;
const taskProfilePath = "profiles/task/basic.profile.md" as const;
const taskRequiredSections = [
  "Objective",
  "Context / Constraints",
  "Materially verifiable success criteria",
  "Execution notes",
] as const;
const taskOptionalSections = ["Dependencies", "Risks", "Notes"] as const;
const taskNormativeSections = [...taskRequiredSections];

test("exports a task profile contract fixture", () => {
  const lookup = {
    doc_spec: agentMarkdownSpec,
    doc_kind: taskDocKind,
    doc_profile: taskProfileId,
  } satisfies ProfileLookupReference;

  const taskProfile = {
    source: {
      path: taskProfilePath,
      rawFrontmatter: {
        profile_id: taskProfileId,
      },
      rawBodyMarkdown: "# Purpose\n\nUse this profile for concrete work.",
    },
    profile_id: taskProfileId,
    doc_spec: agentMarkdownSpec,
    doc_kind: taskDocKind,
    title: "Basic task profile",
    discovery: {
      filenames: ["TASK.md"],
      globs: ["**/*.task.md"],
    },
    metadata: {
      required: [
        {
          name: "title",
          type: "string",
          description: "Human-readable summary of the concrete work unit.",
        },
      ],
      optional: [
        {
          name: "status",
          type: "string",
          enum: ["proposed", "ready", "in_progress", "blocked", "done"],
        },
      ],
    },
    body: {
      required_sections: [...taskRequiredSections],
      optional_sections: [...taskOptionalSections],
    },
    validation: {
      require_declared_doc_spec: agentMarkdownSpec,
      require_declared_doc_kind: taskDocKind,
      require_required_sections: true,
      require_nonempty_sections: [...taskRequiredSections],
      require_checklist_in_success_criteria: true,
    },
    affordances: {
      role: "work",
      actionability: "execute",
      normative_sections: [...taskNormativeSections],
    },
  } satisfies LoadedProfileDocument;

  const resolution = {
    reference: lookup,
    resolved: true,
    profile_id: taskProfile.profile_id,
    profile_path: taskProfile.source.path,
    profile: taskProfile,
  } satisfies ProfileResolutionResult;

  expect(resolution.profile?.affordances.role).toBe("work");
});

test("preserves partial declaration values in profile lookup references", () => {
  const partialLookup = {
    doc_spec: agentMarkdownSpec,
    doc_kind: null,
    doc_profile: null,
  } satisfies ProfileLookupReference;

  expect(partialLookup.doc_kind).toBeNull();
  expect(partialLookup.doc_profile).toBeNull();
});

test("exports normalized validation and affordance fixtures", () => {
  const validation = {
    conformance: "semantically_valid",
    errors: [],
    warnings: [
      {
        code: "degraded-affordance",
        severity: "warning",
        message: "Affordances should be degraded outside semantic validity.",
        path: "affordances.actionability",
      },
    ],
  } satisfies NormalizedValidation;

  const affordances = {
    role: "coordination",
    actionability: "plan",
    normativeSections: [
      "Objective",
      "Context / Constraints",
      "Execution notes",
    ],
  } satisfies ProjectedAffordances;

  expect(validation.warnings).toHaveLength(1);
  expect(affordances.actionability).toBe("plan");
});

test("exports a normalized document fixture", () => {
  const document = {
    source: {
      path: "examples/valid/task.md",
      contentHash: "sha256:demo",
      discoveryMatches: ["**/*.task.md"],
      rawFrontmatter: {
        doc_spec: agentMarkdownSpec,
        doc_kind: taskDocKind,
        doc_profile: taskProfileId,
        title: "Ship the type surface",
      },
      rawBodyMarkdown: "## Objective\n\nDefine shared contracts.",
    },
    declaration: {
      docSpec: agentMarkdownSpec,
      docKind: taskDocKind,
      docProfile: taskProfileId,
      title: "Ship the type surface",
    },
    profile: {
      resolved: true,
      profileId: taskProfileId,
      profilePath: taskProfilePath,
    },
    metadata: {
      title: "Ship the type surface",
      status: "in_progress",
    },
    body: {
      sections: [
        {
          id: "objective",
          heading: "Objective",
          headingPath: ["Objective"],
          level: 2,
          order: 0,
          rawMarkdown: "## Objective\n\nDefine shared contracts.",
          contentMarkdown: "Define shared contracts.",
        },
      ],
    },
    validation: {
      conformance: "semantically_valid",
      errors: [],
      warnings: [],
    },
    affordances: {
      role: "work",
      actionability: "execute",
      normativeSections: [...taskNormativeSections],
    },
    extensions: {},
  } satisfies NormalizedDocument;

  expect(document.profile.resolved).toBe(true);
  expect(document.body.sections[0]?.heading).toBe("Objective");
});

// @ts-expect-error Loaded profiles must keep validation declaration requirements aligned with profile identity.
const invalidTaskProfile: LoadedProfileDocument = {
  source: {
    path: taskProfilePath,
    rawFrontmatter: {
      profile_id: taskProfileId,
    },
    rawBodyMarkdown: "# Purpose\n\nUse this profile for concrete work.",
  },
  profile_id: taskProfileId,
  doc_spec: agentMarkdownSpec,
  doc_kind: taskDocKind,
  title: "Invalid task profile",
  discovery: {
    filenames: ["TASK.md"],
    globs: ["**/*.task.md"],
  },
  metadata: {
    required: [],
    optional: [],
  },
  body: {
    required_sections: [...taskRequiredSections],
    optional_sections: [...taskOptionalSections],
  },
  validation: {
    require_declared_doc_spec: agentMarkdownSpec,
    require_declared_doc_kind: "project",
    require_required_sections: true,
  },
  affordances: {
    role: "work",
    actionability: "execute",
    normative_sections: [...taskNormativeSections],
  },
};

void invalidTaskProfile;
