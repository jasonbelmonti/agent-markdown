import { expect, test } from "bun:test";

import type {
  DiscoverRequest,
  DiscoverResponse,
  DiscoveredDocumentResolvedSummary,
  ExplainProfileResponse,
  NormalizedDocument,
  ResolveResponse,
  ResolverDiscoveryHint,
  ResolverDocumentInput,
  ResolverGuidance,
  ResolverProfileDocument,
  ResolverProfileResolutionResult,
  ResolverResponseResolution,
  ResolverTrust,
  SniffRequest,
  SniffResponse,
} from "../index.ts";

const agentMarkdownSpec = "agent-markdown/0.1" as const;
const taskDocKind = "task" as const;
const taskProfileId = "task/basic@v1" as const;
const taskProfilePath = "profiles/task/basic.profile.md" as const;
const futureProfileId = "policy/automation@v2" as const;
const futureProfilePath = "profiles/policy/automation.profile.md" as const;
const taskRequiredSections = [
  "Objective",
  "Context / Constraints",
  "Materially verifiable success criteria",
  "Execution notes",
] as const;
const taskOptionalSections = ["Dependencies", "Risks", "Notes"] as const;
const taskNormativeSections = [...taskRequiredSections];

const exampleProfile = {
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
      },
    ],
    optional: [
      {
        name: "status",
        type: "string",
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
} satisfies ResolverProfileDocument;

const exampleNormalizedDocument = {
  source: {
    path: "examples/valid/task/basic.task.md",
    contentHash: "sha256:resolver-demo",
    discoveryMatches: ["**/*.task.md"],
    rawFrontmatter: {
      doc_spec: agentMarkdownSpec,
      doc_kind: taskDocKind,
      doc_profile: taskProfileId,
      title: "Ship resolver transport contracts",
    },
    rawBodyMarkdown: "## Objective\n\nShip the transport contract.",
  },
  declaration: {
    docSpec: agentMarkdownSpec,
    docKind: taskDocKind,
    docProfile: taskProfileId,
    title: "Ship resolver transport contracts",
  },
  profile: {
    resolved: true,
    profileId: taskProfileId,
    profilePath: taskProfilePath,
  },
  metadata: {
    title: "Ship resolver transport contracts",
    status: "ready",
  },
  body: {
    sections: [
      {
        id: "objective",
        heading: "Objective",
        headingPath: ["Objective"],
        level: 2,
        order: 0,
        rawMarkdown: "## Objective\n\nShip the transport contract.",
        contentMarkdown: "Ship the transport contract.",
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

const exampleProfileResolution = {
  reference: {
    doc_spec: agentMarkdownSpec,
    doc_kind: taskDocKind,
    doc_profile: taskProfileId,
  },
  resolved: true,
  profile_id: taskProfileId,
  profile_path: taskProfilePath,
  profile: exampleProfile,
  reason: null,
  compatibility: {
    declared_doc_spec: agentMarkdownSpec,
    profile_doc_spec: agentMarkdownSpec,
    doc_spec_compatible: true,
    declared_doc_kind: taskDocKind,
    profile_doc_kind: taskDocKind,
    doc_kind_compatible: true,
  },
} satisfies ResolverProfileResolutionResult;

const exampleResolution = {
  mode: "assistive",
  source: "declaration",
  requestedProfileId: null,
  effectiveProfileId: taskProfileId,
} satisfies ResolverResponseResolution;

const exampleTrust = {
  mayReference: true,
  mayPlanFrom: true,
  mayExecuteFrom: true,
  requiresUserConfirmation: true,
} satisfies ResolverTrust;

const exampleGuidance = {
  codes: ["request_user_confirmation"],
} satisfies ResolverGuidance;

const exampleMatchedHints = [
  {
    kind: "glob",
    value: "**/*.task.md",
    origin: {
      profileId: taskProfileId,
      profilePath: taskProfilePath,
    },
  },
] satisfies ResolverDiscoveryHint[];

const exampleResolvedDiscoverySummary = {
  conformance: "semantically_valid",
  profile: {
    resolved: true,
    profileId: taskProfileId,
    profilePath: taskProfilePath,
    reason: null,
  },
  resolution: exampleResolution,
  trust: exampleTrust,
  guidance: exampleGuidance,
} satisfies DiscoveredDocumentResolvedSummary;

test("exports the resolver transport request and response contracts from the package root", () => {
  const sniffRequest = {
    input: {
      kind: "path",
      path: "examples/valid/task/basic.task.md",
    },
    repoRoot: "/repo",
  } satisfies SniffRequest;

  const sniffResponse = {
    frontmatterFound: true,
    declaration: exampleNormalizedDocument.declaration,
    matchedHints: exampleMatchedHints,
    recommendation: "resolve",
  } satisfies SniffResponse;

  expect(sniffRequest.input.kind).toBe("path");
  expect(sniffResponse.recommendation).toBe("resolve");
});

test("keeps resolver document inputs mutually exclusive between path and content", () => {
  const pathInput = {
    kind: "path",
    path: "examples/valid/task/basic.task.md",
  } satisfies ResolverDocumentInput;

  const contentInput = {
    kind: "content",
    content: "---\ndoc_spec: agent-markdown/0.1\n---\n",
    sourcePath: "TASK.md",
  } satisfies ResolverDocumentInput;

  expect(pathInput.kind).toBe("path");
  expect(contentInput.kind).toBe("content");
});

test("requires resolve responses to embed the normalized document and runtime wrappers", () => {
  const response = {
    normalizedDocument: exampleNormalizedDocument,
    profileResolution: exampleProfileResolution,
    resolution: exampleResolution,
    trust: exampleTrust,
    guidance: exampleGuidance,
  } satisfies ResolveResponse;

  expect(response.normalizedDocument.validation.conformance).toBe(
    "semantically_valid",
  );
  expect(response.guidance.codes).toEqual(["request_user_confirmation"]);
});

test("keeps discovery responses summary-only instead of embedding full normalized documents", () => {
  const request = {
    scopePaths: ["examples/valid"],
    mode: "informational",
  } satisfies DiscoverRequest;

  const response = {
    documents: [
      {
        path: "examples/valid/task/basic.task.md",
        discoveryMatches: ["**/*.task.md"],
        declaration: exampleNormalizedDocument.declaration,
        resolved: exampleResolvedDiscoverySummary,
      },
      {
        path: "notes/TASK.md",
        discoveryMatches: ["TASK.md"],
        declaration: null,
        resolved: null,
      },
    ],
  } satisfies DiscoverResponse;

  expect(request.repoRoot).toBeUndefined();
  expect(response.documents).toHaveLength(2);
  expect(response.documents[0]?.resolved?.profile.profileId).toBe(taskProfileId);
});

test("combines the loaded profile with a derived authoring summary for explain_profile", () => {
  const response = {
    profile: exampleProfile,
    summary: {
      human: "Task documents define executable work with materially verifiable success criteria.",
      requiredMetadata: ["title"],
      optionalMetadata: ["status"],
      requiredSections: [...taskRequiredSections],
      optionalSections: [...taskOptionalSections],
    },
  } satisfies ExplainProfileResponse;

  expect(response.profile.profile_id).toBe(taskProfileId);
  expect(response.summary.requiredSections).toContain("Objective");
});

test("keeps transport profile ids widened beyond the current MVP registry", () => {
  const futureProfile = {
    source: {
      path: futureProfilePath,
      rawFrontmatter: {
        profile_id: futureProfileId,
      },
      rawBodyMarkdown: "# Purpose\n\nUse this profile for automation policies.",
    },
    profile_id: futureProfileId,
    doc_spec: agentMarkdownSpec,
    doc_kind: "policy",
    title: "Automation policy profile",
    discovery: {
      filenames: ["POLICY.md"],
      globs: ["**/*.policy.md"],
    },
    metadata: {
      required: [
        {
          name: "title",
          type: "string",
        },
      ],
      optional: [],
    },
    body: {
      required_sections: ["Objective", "Policy"],
      optional_sections: ["Notes"],
    },
    validation: {
      require_declared_doc_spec: agentMarkdownSpec,
      require_declared_doc_kind: "policy",
      require_required_sections: true,
    },
    affordances: {
      role: "policy",
      actionability: "reference",
      normative_sections: ["Objective", "Policy"],
    },
  } satisfies ResolverProfileDocument;

  const futureProfileResolution = {
    reference: {
      doc_spec: agentMarkdownSpec,
      doc_kind: "policy",
      doc_profile: futureProfileId,
    },
    resolved: true,
    profile_id: futureProfileId,
    profile_path: futureProfilePath,
    profile: futureProfile,
    reason: null,
    compatibility: {
      declared_doc_spec: agentMarkdownSpec,
      profile_doc_spec: agentMarkdownSpec,
      doc_spec_compatible: true,
      declared_doc_kind: "policy",
      profile_doc_kind: "policy",
      doc_kind_compatible: true,
    },
  } satisfies ResolverProfileResolutionResult;

  const futureHints = [
    {
      kind: "glob",
      value: "**/*.policy.md",
      origin: {
        profileId: futureProfileId,
        profilePath: futureProfilePath,
      },
    },
  ] satisfies ResolverDiscoveryHint[];

  const explainResponse = {
    profile: futureProfile,
    summary: {
      human: "Policy documents provide automation guidance without task execution semantics.",
      requiredMetadata: ["title"],
      optionalMetadata: [],
      requiredSections: ["Objective", "Policy"],
      optionalSections: ["Notes"],
    },
  } satisfies ExplainProfileResponse;

  const sniffResponse = {
    frontmatterFound: true,
    declaration: {
      docSpec: agentMarkdownSpec,
      docKind: "policy",
      docProfile: futureProfileId,
      title: "Ship automation policy transport support",
    },
    matchedHints: futureHints,
    recommendation: "resolve",
  } satisfies SniffResponse;

  expect(futureProfileResolution.profile_id).toBe(futureProfileId);
  expect(explainResponse.profile.profile_id).toBe(futureProfileId);
  expect(sniffResponse.matchedHints[0]?.origin.profileId).toBe(futureProfileId);
});

const invalidPathInput: ResolverDocumentInput = {
  kind: "path",
  path: "examples/valid/task/basic.task.md",
  // @ts-expect-error Path inputs may not also include raw markdown content.
  content: "# not allowed",
};

const invalidContentInput: ResolverDocumentInput = {
  kind: "content",
  // @ts-expect-error Content inputs must provide content rather than a path.
  path: "TASK.md",
};

// @ts-expect-error Resolve responses must include explicit trust and guidance wrappers.
const invalidResolveResponse: ResolveResponse = {
  normalizedDocument: exampleNormalizedDocument,
  profileResolution: exampleProfileResolution,
  resolution: exampleResolution,
};

const invalidDiscoverResponse: DiscoverResponse = {
  documents: [
    {
      path: "examples/valid/task/basic.task.md",
      discoveryMatches: ["**/*.task.md"],
      declaration: exampleNormalizedDocument.declaration,
      resolved: {
        ...exampleResolvedDiscoverySummary,
        // @ts-expect-error Discovery summaries must not embed a full normalized document.
        normalizedDocument: exampleNormalizedDocument,
      },
    },
  ],
};

void invalidPathInput;
void invalidContentInput;
void invalidResolveResponse;
void invalidDiscoverResponse;
