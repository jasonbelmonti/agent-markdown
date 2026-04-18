import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  composeNormalizedDocument,
  loadProfileRegistry,
  parseMarkdownSections,
  readDocumentDeclaration,
  resolveProfileReference,
  type NormalizedDocument,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
});

interface ComposeFixtureOptions {
  path: string;
  discoveryMatches: string[];
  markdown: string;
  contentHash?: string;
}

function composeFixture(options: ComposeFixtureOptions): NormalizedDocument {
  const { path, discoveryMatches, markdown, contentHash } = options;
  const discoveredDocument = readDocumentDeclaration({
    candidate: {
      path,
      discoveryMatches,
      matchedHints: [],
    },
    markdown,
  });
  const profileResolution = resolveProfileReference(registry, {
    doc_spec: discoveredDocument.declaration.docSpec,
    doc_kind: discoveredDocument.declaration.docKind,
    doc_profile: discoveredDocument.declaration.docProfile,
  });
  const parsedBody = parseMarkdownSections(discoveredDocument.source.rawBodyMarkdown);

  return composeNormalizedDocument({
    discoveredDocument,
    profileResolution,
    parsedBody,
    contentHash,
  });
}

test("composes a normalized envelope from resolved declaration, profile, metadata, and body seams", () => {
  expect(
    composeFixture({
      path: "plans/TASK.md",
      discoveryMatches: ["TASK.md"],
      contentHash: "sha256:test-normalized-envelope",
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
      errors: [
        {
          code: "required-section-missing",
          severity: "error",
          message:
            'Required section "Context / Constraints" is missing for profile "task/basic@v1".',
          path: 'body.sections["Context / Constraints"]',
        },
        {
          code: "required-section-missing",
          severity: "error",
          message:
            'Required section "Materially verifiable success criteria" is missing for profile "task/basic@v1".',
          path: 'body.sections["Materially verifiable success criteria"]',
        },
      ],
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

test("keeps resolved documents below structural validity when required metadata is missing", () => {
  expect(
    composeFixture({
      path: "plans/missing-title.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
status: ready
---
## Objective

Prove missing required metadata stays structural.

## Context / Constraints

Keep the body otherwise valid so the missing title is isolated.

## Materially verifiable success criteria

- [ ] The document resolves its declared profile.
- [ ] Structural validation reports the missing title deterministically.

## Execution notes

Do not introduce unrelated validation failures.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "required-metadata-missing",
        severity: "error",
        message:
          'Required metadata field "title" is missing or invalid for profile "task/basic@v1".',
        path: "metadata.title",
      },
    ],
    warnings: [],
  });
});

test("reports empty required sections without duplicating missing-section errors", () => {
  expect(
    composeFixture({
      path: "plans/empty-execution-notes.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Keep empty sections structural
status: ready
---
## Objective

Prove empty required sections stay in structural validation.

## Context / Constraints

Keep every required heading present so emptiness is the only failure.

## Materially verifiable success criteria

- [ ] Structural validation treats an empty section as present but invalid.

## Execution notes
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "required-section-empty",
        severity: "error",
        message:
          'Required section "Execution notes" must not be empty for profile "task/basic@v1".',
        path: 'body.sections["Execution notes"]',
      },
    ],
    warnings: [],
  });
});

test("requires canonical sections to exist at the top level", () => {
  const normalized = composeFixture({
    path: "plans/nested-execution-notes.task.md",
    discoveryMatches: ["**/*.task.md"],
    markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Keep required sections top-level
status: ready
---
## Objective

Prove nested headings do not satisfy required top-level sections.

### Execution notes

This nested section should not satisfy the task profile contract.

## Context / Constraints

Keep every other required section valid so the placement bug is isolated.

## Materially verifiable success criteria

- [ ] Structural validation rejects nested-only required sections.

`,
  });

  expect(
    normalized.body.sections.map((section) => ({
      heading: section.heading,
      headingPath: section.headingPath,
    })),
  ).toEqual([
    {
      heading: "Objective",
      headingPath: ["Objective"],
    },
    {
      heading: "Execution notes",
      headingPath: ["Objective", "Execution notes"],
    },
    {
      heading: "Context / Constraints",
      headingPath: ["Context / Constraints"],
    },
    {
      heading: "Materially verifiable success criteria",
      headingPath: ["Materially verifiable success criteria"],
    },
  ]);
  expect(normalized.validation).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "required-section-missing",
        severity: "error",
        message:
          'Required section "Execution notes" is missing for profile "task/basic@v1".',
        path: 'body.sections["Execution notes"]',
      },
    ],
    warnings: [],
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
