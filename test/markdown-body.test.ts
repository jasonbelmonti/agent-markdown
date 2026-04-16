import { expect, test } from "bun:test";

import { parseMarkdownSections } from "../index.ts";

test("parses ordered sections with heading paths while leaving preamble in raw body only", () => {
  const markdown = `Intro text that remains source-only.

## Objective

Ship the parsing seam.

### Risks

Avoid turning headings into vibes-based soup.

## Execution notes

Keep the boundary deterministic.
`;

  expect(parseMarkdownSections(markdown)).toEqual({
    rawMarkdown: markdown,
    sections: [
      {
        id: "objective",
        heading: "Objective",
        headingPath: ["Objective"],
        level: 2,
        order: 0,
        rawMarkdown: `## Objective

Ship the parsing seam.

`,
        contentMarkdown: "Ship the parsing seam.",
      },
      {
        id: "objective-risks",
        heading: "Risks",
        headingPath: ["Objective", "Risks"],
        level: 3,
        order: 1,
        rawMarkdown: `### Risks

Avoid turning headings into vibes-based soup.

`,
        contentMarkdown: "Avoid turning headings into vibes-based soup.",
      },
      {
        id: "execution-notes",
        heading: "Execution notes",
        headingPath: ["Execution notes"],
        level: 2,
        order: 2,
        rawMarkdown: `## Execution notes

Keep the boundary deterministic.
`,
        contentMarkdown: "Keep the boundary deterministic.",
      },
    ],
  });
});

test("preserves raw section slices and ignores heading-like lines inside fenced blocks", () => {
  const markdown = `## Objective

\`\`\`md
## definitely-not-a-section
\`\`\`

Still part of the objective.

## Notes

Document the behavior.
`;

  expect(parseMarkdownSections(markdown).sections).toEqual([
    {
      id: "objective",
      heading: "Objective",
      headingPath: ["Objective"],
      level: 2,
      order: 0,
      rawMarkdown: `## Objective

\`\`\`md
## definitely-not-a-section
\`\`\`

Still part of the objective.

`,
      contentMarkdown: `\`\`\`md
## definitely-not-a-section
\`\`\`

Still part of the objective.`,
    },
    {
      id: "notes",
      heading: "Notes",
      headingPath: ["Notes"],
      level: 2,
      order: 1,
      rawMarkdown: `## Notes

Document the behavior.
`,
      contentMarkdown: "Document the behavior.",
    },
  ]);
});

test("creates stable unique ids for repeated heading paths", () => {
  const markdown = `## Notes

First note.

## Notes

Second note.

### Follow-up

Nested detail.

## Notes

Third note.
`;

  expect(parseMarkdownSections(markdown).sections.map((section) => section.id)).toEqual([
    "notes",
    "notes-2",
    "notes-follow-up",
    "notes-3",
  ]);
});

test("uses ATX headings as section boundaries and ignores setext headings", () => {
  const markdown = `Title-like preamble
===================

## Objective ##

Ship it.
`;

  expect(parseMarkdownSections(markdown)).toEqual({
    rawMarkdown: markdown,
    sections: [
      {
        id: "objective",
        heading: "Objective",
        headingPath: ["Objective"],
        level: 2,
        order: 0,
        rawMarkdown: `## Objective ##

Ship it.
`,
        contentMarkdown: "Ship it.",
      },
    ],
  });
});
