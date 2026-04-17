import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  composeNormalizedDocument,
  loadProfileRegistry,
  parseMarkdownSections,
  readDocumentDeclaration,
  resolveProfileReference,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
});

test("composes a normalized envelope from resolved declaration, profile, metadata, and body seams", () => {
  const discoveredDocument = readDocumentDeclaration({
    candidate: {
      path: "plans/TASK.md",
      discoveryMatches: ["TASK.md"],
      matchedHints: [],
    },
    markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Compose the normalization seam
status: in_progress
owners:
  - ops
  - docs
due_date: "2026-05-01"
extra_flag: preserve-in-source-only
---
## Objective

Build the shared normalized envelope.

## Execution notes

Wire together the landed seams without mixing in validation.
`,
  });
  const profileResolution = resolveProfileReference(registry, {
    doc_spec: discoveredDocument.declaration.docSpec,
    doc_kind: discoveredDocument.declaration.docKind,
    doc_profile: discoveredDocument.declaration.docProfile,
  });
  const parsedBody = parseMarkdownSections(discoveredDocument.source.rawBodyMarkdown);

  expect(
    composeNormalizedDocument({
      discoveredDocument,
      profileResolution,
      parsedBody,
      contentHash: "sha256:test-normalized-envelope",
    }),
  ).toEqual({
    source: {
      path: "plans/TASK.md",
      contentHash: "sha256:test-normalized-envelope",
      discoveryMatches: ["TASK.md"],
      rawFrontmatter: {
        doc_spec: "agent-markdown/0.1",
        doc_kind: "task",
        doc_profile: "task/basic@v1",
        title: "Compose the normalization seam",
        status: "in_progress",
        owners: ["ops", "docs"],
        due_date: "2026-05-01",
        extra_flag: "preserve-in-source-only",
      },
      rawBodyMarkdown: `## Objective

Build the shared normalized envelope.

## Execution notes

Wire together the landed seams without mixing in validation.
`,
    },
    declaration: {
      docSpec: "agent-markdown/0.1",
      docKind: "task",
      docProfile: "task/basic@v1",
      title: "Compose the normalization seam",
    },
    profile: {
      resolved: true,
      profileId: "task/basic@v1",
      profilePath: "profiles/task/basic.profile.md",
    },
    metadata: {
      title: "Compose the normalization seam",
      status: "in_progress",
      owners: ["ops", "docs"],
      due_date: "2026-05-01",
    },
    body: {
      sections: [
        {
          id: "objective",
          heading: "Objective",
          headingPath: ["Objective"],
          level: 2,
          order: 0,
          rawMarkdown: `## Objective

Build the shared normalized envelope.

`,
          contentMarkdown: "Build the shared normalized envelope.",
        },
        {
          id: "execution-notes",
          heading: "Execution notes",
          headingPath: ["Execution notes"],
          level: 2,
          order: 1,
          rawMarkdown: `## Execution notes

Wire together the landed seams without mixing in validation.
`,
          contentMarkdown:
            "Wire together the landed seams without mixing in validation.",
        },
      ],
    },
    validation: {
      conformance: "recognized",
      errors: [],
      warnings: [],
    },
    affordances: {
      role: null,
      actionability: null,
      normativeSections: [
        "Objective",
        "Context / Constraints",
        "Materially verifiable success criteria",
        "Execution notes",
      ],
    },
    extensions: {},
  });
});

test("returns a deterministic degraded envelope when profile resolution is unavailable", () => {
  const discoveredDocument = readDocumentDeclaration({
    candidate: {
      path: "drafts/brief.md",
      discoveryMatches: ["**/*.brief.md"],
      matchedHints: [],
    },
    markdown: `---
title: Partial declaration only
owners:
  - review
---
## Objective

Capture a draft before the profile is declared.
`,
  });
  const profileResolution = resolveProfileReference(registry, {
    doc_spec: discoveredDocument.declaration.docSpec,
    doc_kind: discoveredDocument.declaration.docKind,
    doc_profile: discoveredDocument.declaration.docProfile,
  });
  const parsedBody = parseMarkdownSections(discoveredDocument.source.rawBodyMarkdown);

  expect(
    composeNormalizedDocument({
      discoveredDocument,
      profileResolution,
      parsedBody,
    }),
  ).toEqual({
    source: {
      path: "drafts/brief.md",
      contentHash: "",
      discoveryMatches: ["**/*.brief.md"],
      rawFrontmatter: {
        title: "Partial declaration only",
        owners: ["review"],
      },
      rawBodyMarkdown: `## Objective

Capture a draft before the profile is declared.
`,
    },
    declaration: {
      docSpec: null,
      docKind: null,
      docProfile: null,
      title: "Partial declaration only",
    },
    profile: {
      resolved: false,
      profileId: null,
      profilePath: null,
    },
    metadata: {},
    body: {
      sections: [
        {
          id: "objective",
          heading: "Objective",
          headingPath: ["Objective"],
          level: 2,
          order: 0,
          rawMarkdown: `## Objective

Capture a draft before the profile is declared.
`,
          contentMarkdown: "Capture a draft before the profile is declared.",
        },
      ],
    },
    validation: {
      conformance: "candidate",
      errors: [],
      warnings: [],
    },
    affordances: {
      role: null,
      actionability: null,
      normativeSections: [],
    },
    extensions: {},
  });
});

test("does not apply profile-driven metadata filtering when the declaration is incompatible", () => {
  const discoveredDocument = readDocumentDeclaration({
    candidate: {
      path: "plans/PROJECT.md",
      discoveryMatches: ["PROJECT.md"],
      matchedHints: [],
    },
    markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: project
doc_profile: task/basic@v1
title: Keep unresolved metadata raw-only
status: active
horizon: q3
---
## Objective

Keep candidate documents non-semantic.
`,
  });
  const profileResolution = resolveProfileReference(registry, {
    doc_spec: discoveredDocument.declaration.docSpec,
    doc_kind: discoveredDocument.declaration.docKind,
    doc_profile: discoveredDocument.declaration.docProfile,
  });
  const parsedBody = parseMarkdownSections(discoveredDocument.source.rawBodyMarkdown);

  expect(profileResolution.resolved).toBe(false);
  expect(profileResolution.profile_id).toBe("task/basic@v1");

  expect(
    composeNormalizedDocument({
      discoveredDocument,
      profileResolution,
      parsedBody,
    }),
  ).toEqual({
    source: {
      path: "plans/PROJECT.md",
      contentHash: "",
      discoveryMatches: ["PROJECT.md"],
      rawFrontmatter: {
        doc_spec: "agent-markdown/0.1",
        doc_kind: "project",
        doc_profile: "task/basic@v1",
        title: "Keep unresolved metadata raw-only",
        status: "active",
        horizon: "q3",
      },
      rawBodyMarkdown: `## Objective

Keep candidate documents non-semantic.
`,
    },
    declaration: {
      docSpec: "agent-markdown/0.1",
      docKind: "project",
      docProfile: "task/basic@v1",
      title: "Keep unresolved metadata raw-only",
    },
    profile: {
      resolved: false,
      profileId: "task/basic@v1",
      profilePath: "profiles/task/basic.profile.md",
    },
    metadata: {},
    body: {
      sections: [
        {
          id: "objective",
          heading: "Objective",
          headingPath: ["Objective"],
          level: 2,
          order: 0,
          rawMarkdown: `## Objective

Keep candidate documents non-semantic.
`,
          contentMarkdown: "Keep candidate documents non-semantic.",
        },
      ],
    },
    validation: {
      conformance: "candidate",
      errors: [],
      warnings: [],
    },
    affordances: {
      role: null,
      actionability: null,
      normativeSections: [
        "Objective",
        "Context / Constraints",
        "Materially verifiable success criteria",
        "Execution notes",
      ],
    },
    extensions: {},
  });
});
