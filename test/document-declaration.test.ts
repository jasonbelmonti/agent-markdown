import { expect, test } from "bun:test";

import { parseDocumentFrontmatter, readDocumentDeclaration } from "../index.ts";

test("reads canonical declaration fields and preserves raw source content", () => {
  const document = readDocumentDeclaration({
    candidate: {
      path: "plans/TASK.md",
      discoveryMatches: ["TASK.md"],
      matchedHints: [],
    },
    markdown: `---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Ship the runtime seam
status: in_progress
---
## Objective

Read the declaration before the profile lookup.
`,
  });

  expect(document).toEqual({
    source: {
      path: "plans/TASK.md",
      discoveryMatches: ["TASK.md"],
      rawFrontmatter: {
        doc_spec: "agent-markdown/0.1",
        doc_kind: "task",
        doc_profile: "task/basic@v1",
        title: "Ship the runtime seam",
        status: "in_progress",
      },
      rawBodyMarkdown: `## Objective

Read the declaration before the profile lookup.
`,
    },
    declaration: {
      docSpec: "agent-markdown/0.1",
      docKind: "task",
      docProfile: "task/basic@v1",
      title: "Ship the runtime seam",
    },
  });
});

test("keeps partial or missing declarations representable without inferring semantics", () => {
  const document = readDocumentDeclaration({
    candidate: {
      path: "plans/overview.brief.md",
      discoveryMatches: ["**/*.brief.md"],
      matchedHints: [
        {
          kind: "glob",
          value: "**/*.brief.md",
          origin: {
            profileId: "brief/basic@v1",
            profilePath: "profiles/brief/basic.profile.md",
          },
        },
      ],
    },
    markdown: `---
title: Runtime handoff
doc_profile: 42
---
Body text that still needs later validation.
`,
  });

  expect(document.source.discoveryMatches).toEqual(["**/*.brief.md"]);
  expect(document.source.rawFrontmatter).toEqual({
    title: "Runtime handoff",
    doc_profile: 42,
  });
  expect(document.source.rawBodyMarkdown).toBe(
    "Body text that still needs later validation.\n",
  );
  expect(document.declaration).toEqual({
    docSpec: null,
    docKind: null,
    docProfile: null,
    title: "Runtime handoff",
  });
});

test("treats documents without leading frontmatter as source-preserving partial reads", () => {
  expect(
    parseDocumentFrontmatter(
      `## Objective

Discovery can find a candidate before declarations exist.
`,
      "drafts/TASK.md",
    ),
  ).toEqual({
    rawFrontmatter: {},
    rawBodyMarkdown: `## Objective

Discovery can find a candidate before declarations exist.
`,
  });
});

test("accepts empty YAML frontmatter delimiters as an empty mapping", () => {
  expect(
    parseDocumentFrontmatter(
      `---
---
## Objective

This document intentionally declares an empty mapping.
`,
      "drafts/EMPTY.md",
    ),
  ).toEqual({
    rawFrontmatter: {},
    rawBodyMarkdown: `## Objective

This document intentionally declares an empty mapping.
`,
  });
});
