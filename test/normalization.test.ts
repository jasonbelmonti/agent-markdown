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
import {
  htmlBlockFixtureWrappers,
  htmlRawTagNames,
} from "./support/html-block-fixtures.ts";

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

function createHiddenHtmlFixturePath(
  wrapperFixtureSlug: string,
  fixtureKind: "section" | "checklist",
): string {
  return `plans/hidden-${wrapperFixtureSlug}-${fixtureKind}.task.md`;
}

function createListIndentedHtmlFixturePath(wrapperFixtureSlug: string): string {
  return `plans/list-indented-${wrapperFixtureSlug}-checklist.task.md`;
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

test("treats required sections with only nested subsection content as nonempty", () => {
  expect(
    composeFixture({
      path: "plans/nested-execution-content.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Count nested subsection content
status: ready
---
## Objective

Keep structural emptiness checks aligned with section subtrees.

## Context / Constraints

Only nested subsection content should satisfy the execution-notes content rule.

## Materially verifiable success criteria

- [ ] Nested subsection content counts as nonempty for required sections.

## Execution notes

### Implementation detail

This nested subsection carries the only execution-notes content.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
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

for (const wrapper of htmlBlockFixtureWrappers) {
  test(`does not treat required sections hidden inside ${wrapper.label} as real sections`, () => {
    expect(
      composeFixture({
        path: createHiddenHtmlFixturePath(wrapper.fixtureSlug, "section"),
        discoveryMatches: ["**/*.task.md"],
        markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Hidden required sections stay invalid
status: ready
---
## Objective

Keep hidden headings from satisfying required sections.

## Context / Constraints

The only success-criteria heading in this fixture is hidden inside ${wrapper.label}.

${wrapper.start}

## Materially verifiable success criteria

- [ ] Hidden checklist only.

${wrapper.end}

## Execution notes

Keep the rest of the document valid.
`,
      }).validation,
    ).toEqual({
      conformance: "recognized",
      errors: [
        {
          code: "required-section-missing",
          severity: "error",
          message:
            'Required section "Materially verifiable success criteria" is missing for profile "task/basic@v1".',
          path: 'body.sections["Materially verifiable success criteria"]',
        },
      ],
      warnings: [],
    });
  });
}

test("accepts checklist items inside nested success-criteria subsections", () => {
  expect(
    composeFixture({
      path: "plans/nested-success-criteria-checklist.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Count nested success-criteria checklists
status: ready
---
## Objective

Keep checklist validation aligned with section subtrees.

## Context / Constraints

The only checklist items in this section live under a nested subsection.

## Materially verifiable success criteria

### Verification checklist

- [ ] Nested checklist items satisfy the structural checklist rule.

## Execution notes

Do not require checklist markers to appear directly under the top-level heading.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("accepts markdown checklist markers beyond top-level dash bullets", () => {
  expect(
    composeFixture({
      path: "plans/variant-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Accept markdown checklist variants
status: ready
---
## Objective

Keep checklist validation aligned with Markdown task-list syntax.

## Context / Constraints

The validator should accept bullet markers other than \`-\`, indented task
items, and ordered task-list markers.

## Materially verifiable success criteria

* [ ] The validator accepts star-prefixed task items.
  + [ ] The validator also accepts indented plus-prefixed task items.
1. [ ] The validator accepts ordered task-list items.

## Execution notes

Limit the implementation to structural checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("accepts checklist items nested under non-checklist list items", () => {
  expect(
    composeFixture({
      path: "plans/nested-list-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Accept nested checklist list items
status: ready
---
## Objective

Keep checklist detection aligned with nested Markdown lists.

## Context / Constraints

The only checklist items in this section are nested underneath a parent list item.

## Materially verifiable success criteria

- Parent item
    1. [ ] Nested ordered checklist items remain valid.

## Execution notes

Limit the fix to structural checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

for (const wrapper of htmlBlockFixtureWrappers) {
  test(`does not count checklist items hidden inside ${wrapper.label}`, () => {
    expect(
      composeFixture({
        path: createHiddenHtmlFixturePath(wrapper.fixtureSlug, "checklist"),
        discoveryMatches: ["**/*.task.md"],
        markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Hidden checklist items stay invalid
status: ready
---
## Objective

Keep hidden checklist syntax from satisfying validation.

## Context / Constraints

The only task-list marker in this section is hidden inside ${wrapper.label}.

## Materially verifiable success criteria

${wrapper.start}

- [ ] Hidden checklist only.

${wrapper.end}

## Execution notes

Keep every other structural requirement valid.
`,
      }).validation,
    ).toEqual({
      conformance: "recognized",
      errors: [
        {
          code: "checklist-required",
          severity: "error",
          message:
            'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
          path: 'body.sections["Materially verifiable success criteria"]',
        },
      ],
      warnings: [],
    });
  });
}

for (const wrapper of htmlBlockFixtureWrappers) {
  test(`does not count checklist items hidden inside list-indented ${wrapper.label}`, () => {
    expect(
      composeFixture({
        path: createListIndentedHtmlFixturePath(wrapper.fixtureSlug),
        discoveryMatches: ["**/*.task.md"],
        markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: List-indented hidden checklist items stay invalid
status: ready
---
## Objective

Keep list-indented HTML wrappers from satisfying checklist validation.

## Context / Constraints

The only task-list marker in this section is hidden inside ${wrapper.label} nested under a parent list item.

## Materially verifiable success criteria

- Parent item
    ${wrapper.start}

    - [ ] Hidden checklist only.

    ${wrapper.end}

## Execution notes

Keep every other structural requirement valid.
`,
      }).validation,
    ).toEqual({
      conformance: "recognized",
      errors: [
        {
          code: "checklist-required",
          severity: "error",
          message:
            'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
          path: 'body.sections["Materially verifiable success criteria"]',
        },
      ],
      warnings: [],
    });
  });
}

for (const tag of htmlRawTagNames) {
  test(`keeps checklist scanning active after single-line <${tag}> blocks`, () => {
    expect(
      composeFixture({
        path: `plans/single-line-${tag}-blocks.task.md`,
        discoveryMatches: ["**/*.task.md"],
        markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Resume after single-line ${tag} blocks
status: ready
---
## Objective

Keep visible checklist items countable after one-line raw HTML blocks.

## Context / Constraints

The single-line <${tag}> block appears before the only visible checklist item.

## Materially verifiable success criteria

<${tag}>- [ ] Hidden checklist only.</${tag}>

- [ ] Visible checklist remains valid.

## Execution notes

Limit the fix to closing one-line raw HTML block states correctly.
`,
      }).validation,
    ).toEqual({
      conformance: "semantically_valid",
      errors: [],
      warnings: [],
    });
  });
}

test("keeps list context across continuation paragraphs", () => {
  expect(
    composeFixture({
      path: "plans/list-continuation-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Preserve continuation paragraph list context
status: ready
---
## Objective

Keep checklist detection aligned with list continuation paragraphs.

## Context / Constraints

The only valid checklist item in this section appears after a continuation paragraph under an ordered list item.

## Materially verifiable success criteria

10. Parent item
    Intro paragraph
    - [ ] Child task remains a valid nested checklist item.

## Execution notes

Limit the fix to list-context retention across continuation lines.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("keeps list context across lazy continuation paragraphs", () => {
  expect(
    composeFixture({
      path: "plans/lazy-list-continuation-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Preserve lazy continuation list context
status: ready
---
## Objective

Keep checklist detection aligned with lazy list continuation paragraphs.

## Context / Constraints

The only valid checklist item in this section appears after an unindented continuation paragraph under an ordered list item.

## Materially verifiable success criteria

10. Parent item
Continuation text
    - [ ] Child task remains a valid nested checklist item.

## Execution notes

Limit the fix to lazy continuation handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("treats mixed space-tab indentation using markdown tab stops", () => {
  expect(
    composeFixture({
      path: "plans/mixed-tab-stop-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Respect markdown tab stops in checklist indentation
status: ready
---
## Objective

Keep checklist indentation aligned with Markdown tab stops.

## Context / Constraints

The child checklist item begins with two spaces and a tab, which lands on column 4 and should remain nested under the parent list item.

## Materially verifiable success criteria

- Parent item
  \t- [ ] Mixed indentation still counts as a nested checklist item.

## Execution notes

Limit the fix to indentation width calculation in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("does not keep list context across thematic breaks", () => {
  expect(
    composeFixture({
      path: "plans/list-thematic-break-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at thematic breaks
status: ready
---
## Objective

Keep lazy continuation handling limited to paragraph lines.

## Context / Constraints

Thematic breaks should terminate list context before later indented checklist-looking lines.

## Materially verifiable success criteria

10. Parent item
---
    - [ ] This line should not count after the thematic break.

## Execution notes

Limit the fix to lazy continuation block-starter handling.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context across html block starts", () => {
  expect(
    composeFixture({
      path: "plans/list-html-block-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at html block starts
status: ready
---
## Objective

Keep lazy continuation handling from crossing HTML block starts.

## Context / Constraints

An HTML block start like <details> should terminate lazy continuation before a later indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
<details>
    - [ ] This line should not count after the html block starts.
</details>

## Execution notes

Limit the fix to html-block handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context across void html block starts", () => {
  expect(
    composeFixture({
      path: "plans/list-void-html-block-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at void html block starts
status: ready
---
## Objective

Keep lazy continuation handling from crossing void HTML block starts.

## Context / Constraints

A void HTML block start like <hr> should terminate lazy continuation before a later indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
<hr>
    - [ ] This line should not count after the html block starts.

## Execution notes

Limit the fix to void html-block handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context across closing html tags", () => {
  expect(
    composeFixture({
      path: "plans/list-closing-html-tag-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at closing html tags
status: ready
---
## Objective

Keep lazy continuation handling from crossing closing HTML tags.

## Context / Constraints

A closing HTML tag like </details> should terminate lazy continuation before a later indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
</details>
    - [ ] This line should not count after the closing html tag.

## Execution notes

Limit the fix to closing html-tag handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep stale list context after outdented html block closes", () => {
  expect(
    composeFixture({
      path: "plans/list-outdented-html-close-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop stale list context after html block closes
status: ready
---
## Objective

Keep checklist detection from preserving stale list context after HTML blocks close outdented.

## Context / Constraints

The HTML block starts nested under a parent list item, but the closing tag is outdented before a later indented checklist-looking line.

## Materially verifiable success criteria

- Parent item
    <details>
</details>
    - [ ] This line should not count after the html block closes outdented.

## Execution notes

Limit the fix to list-context collapse while consuming html block lines.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("keeps list context across blank lines inside html blocks", () => {
  expect(
    composeFixture({
      path: "plans/list-blank-html-block-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Preserve list context across blank html block lines
status: ready
---
## Objective

Keep valid nested checklist items visible after list-indented HTML blocks that contain blank lines.

## Context / Constraints

The HTML block starts inside a parent list item, contains an interior blank line, then closes before a later nested checklist item at the same list indentation.

## Materially verifiable success criteria

- Parent item
    <details>

    </details>
    - [ ] This visible nested checklist item should still count.

## Execution notes

Limit the fix to preserving list context across blank lines while consuming html blocks.
`,
    }).validation,
  ).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
});

test("does not keep list context across type-1 html block starts", () => {
  for (const tag of ["script", "style", "pre", "textarea"]) {
    expect(
      composeFixture({
        path: `plans/list-${tag}-block-checklists.task.md`,
        discoveryMatches: ["**/*.task.md"],
        markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at ${tag} block starts
status: ready
---
## Objective

Keep lazy continuation handling from crossing type-1 HTML block starts.

## Context / Constraints

An HTML block start like <${tag}> should terminate lazy continuation before a later indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
<${tag}>
    - [ ] This line should not count after the html block starts.
</${tag}>

## Execution notes

Limit the fix to type-1 html-block handling in checklist detection.
`,
      }).validation,
    ).toEqual({
      conformance: "recognized",
      errors: [
        {
          code: "checklist-required",
          severity: "error",
          message:
            'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
          path: 'body.sections["Materially verifiable success criteria"]',
        },
      ],
      warnings: [],
    });
  }
});

test("does not keep list context after indented code lines", () => {
  expect(
    composeFixture({
      path: "plans/list-indented-code-break-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context after indented code lines
status: ready
---
## Objective

Keep lazy continuation handling from crossing indented code blocks.

## Context / Constraints

After an indented code line inside a list item, later outdented prose should not revive the earlier list context before an indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
        code sample
Outside paragraph
    - [ ] This line should not count after the indented code.

## Execution notes

Limit the fix to indented-code handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context across top-level fenced code blocks", () => {
  expect(
    composeFixture({
      path: "plans/list-top-level-fence-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context at top-level fences
status: ready
---
## Objective

Keep top-level fenced blocks from preserving stale list context.

## Context / Constraints

The fenced block starts at column 0, so it should terminate the preceding ordered-list context before later indented checklist-looking lines.

## Materially verifiable success criteria

10. Parent item
\`\`\`md
code sample
\`\`\`
    - [ ] This line should not count after the top-level fence.

## Execution notes

Limit the fix to top-level fenced-block handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context after fenced code blocks close", () => {
  expect(
    composeFixture({
      path: "plans/list-post-fence-prose-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop list context after fenced blocks close
status: ready
---
## Objective

Keep closed fenced blocks from preserving stale list context.

## Context / Constraints

Once a top-level fenced block closes, later prose should not revive the earlier ordered-list context before an indented checklist-looking line.

## Materially verifiable success criteria

10. Parent item
\`\`\`md
code sample
\`\`\`
Follow-up prose after the fence is not a lazy continuation.
    - [ ] This line should not count after the closed fence.

## Execution notes

Limit the fix to post-fence list-context handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("does not keep list context after nested fenced code blocks close", () => {
  expect(
    composeFixture({
      path: "plans/nested-list-post-fence-prose-checklists.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Stop nested list context after fenced blocks close
status: ready
---
## Objective

Keep closed fenced blocks inside list items from preserving stale list context.

## Context / Constraints

After an indented fenced block closes inside a list item, later outdented prose should not revive the earlier list context before an indented checklist-looking line.

## Materially verifiable success criteria

- Parent item

    \`\`\`md
    code sample
    \`\`\`
Outside paragraph
    - [ ] This line should not count after the closed nested fence.

## Execution notes

Limit the fix to post-fence nested-list handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("ignores checklist-like code blocks nested inside list items", () => {
  expect(
    composeFixture({
      path: "plans/nested-list-code-checklist.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ignore checklist-like code in nested lists
status: ready
---
## Objective

Keep indented code blocks inside lists from satisfying checklist validation.

## Context / Constraints

The only checklist-looking text in this section appears inside an indented code block nested under a list item.

## Materially verifiable success criteria

- Parent item

      - [ ] This is only code inside the list item.

- The prose afterward is not a real checklist item.

## Execution notes

Limit the fix to checklist detection inside nested list structures.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("ignores checklist-like text inside fenced code blocks nested inside list items", () => {
  expect(
    composeFixture({
      path: "plans/nested-list-fenced-checklist.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ignore fenced checklist code in nested lists
status: ready
---
## Objective

Keep fenced code blocks inside list items from satisfying checklist validation.

## Context / Constraints

The only checklist-looking text in this section appears inside a fenced code block nested under a list item.

## Materially verifiable success criteria

- Parent item

    \`\`\`md
    - [ ] This is only a fenced code sample inside the list item.
    \`\`\`

- The prose afterward is not a real checklist item.

## Execution notes

Limit the fix to nested fenced-code handling in checklist detection.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("keeps duplicate top-level normative sections below semantic validity", () => {
  expect(
    composeFixture({
      path: "plans/duplicate-objective.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Reject ambiguous normative sections
status: ready
---
## Objective

Keep the first objective around to make the ambiguity obvious.

## Objective

The second objective should make the document structurally parseable but
semantically ambiguous.

## Context / Constraints

Only semantic validation should fail in this fixture.

## Materially verifiable success criteria

- [ ] The duplicate top-level objective blocks semantic trust.

## Execution notes

Leave structural requirements intact so the semantic seam is isolated.
`,
    }).validation,
  ).toEqual({
    conformance: "structurally_valid",
    errors: [
      {
        code: "normative-section-ambiguous",
        severity: "error",
        message:
          'Normative section "Objective" must appear at most once at the top level for profile "task/basic@v1".',
        path: 'body.sections["Objective"]',
      },
    ],
    warnings: [
      {
        code: "degraded-affordance",
        severity: "warning",
        message:
          'Affordances remain degraded until semantic validation passes for profile "task/basic@v1".',
        path: "affordances.actionability",
      },
    ],
  });
});

test("ignores checklist-like text inside indented code blocks", () => {
  expect(
    composeFixture({
      path: "plans/indented-code-checklist-example.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ignore indented code checklist examples
status: ready
---
## Objective

Keep indented code samples from satisfying task checklist validation.

## Context / Constraints

The section should otherwise stay valid so the indentation behavior is isolated.

## Materially verifiable success criteria

    - [ ] This is an indented code sample.
    1. [ ] This ordered example is also code, not a checklist item.

- Criteria are described in prose afterward without real checklist markers.

## Execution notes

Use indented code as the only source of checklist syntax in this section.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
      },
    ],
    warnings: [],
  });
});

test("treats duplicate top-level headings deterministically", () => {
  expect(
    composeFixture({
      path: "plans/duplicate-execution-notes.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ignore duplicate heading order
status: ready
---
## Objective

Keep duplicate required headings from changing conformance by order alone.

## Context / Constraints

One duplicate execution-notes heading is nonempty and the later duplicate is empty.

## Materially verifiable success criteria

- [ ] Structural validation aggregates duplicate top-level headings deterministically.

## Execution notes

This first duplicate contains the required content.

## Execution notes
`,
    }).validation,
  ).toEqual({
    conformance: "structurally_valid",
    errors: [
      {
        code: "normative-section-ambiguous",
        severity: "error",
        message:
          'Normative section "Execution notes" must appear at most once at the top level for profile "task/basic@v1".',
        path: 'body.sections["Execution notes"]',
      },
    ],
    warnings: [
      {
        code: "degraded-affordance",
        severity: "warning",
        message:
          'Affordances remain degraded until semantic validation passes for profile "task/basic@v1".',
        path: "affordances.actionability",
      },
    ],
  });
});

test("ignores checklist-like text inside fenced code blocks", () => {
  expect(
    composeFixture({
      path: "plans/fenced-checklist-example.task.md",
      discoveryMatches: ["**/*.task.md"],
      markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ignore fenced checklist examples
status: ready
---
## Objective

Keep code samples from satisfying task checklist validation.

## Context / Constraints

The section should otherwise stay valid so the fence behavior is isolated.

## Materially verifiable success criteria

\`\`\`md
- [ ] This is only a code sample.
* [ ] This should not satisfy validation either.
\`\`\`

- Criteria are described in prose afterward without real checklist markers.

## Execution notes

Use fenced code as the only source of checklist syntax in this section.
`,
    }).validation,
  ).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "checklist-required",
        severity: "error",
        message:
          'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        path: 'body.sections["Materially verifiable success criteria"]',
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
