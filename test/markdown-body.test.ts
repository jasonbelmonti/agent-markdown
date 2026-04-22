import { expect, test } from "bun:test";

import { parseMarkdownSections } from "../index.ts";
import {
  htmlBlockFixtureWrappers,
  htmlRawTagNames,
} from "./support/html-block-fixtures.ts";

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

test("does not treat invalid backtick fence info strings as fenced blocks", () => {
  const markdown = `## Objective

\`\`\`js\`bad
This line stays plain text.

## Notes

This heading must still be detected.
`;

  expect(parseMarkdownSections(markdown).sections).toEqual([
    {
      id: "objective",
      heading: "Objective",
      headingPath: ["Objective"],
      level: 2,
      order: 0,
      rawMarkdown: `## Objective

\`\`\`js\`bad
This line stays plain text.

`,
      contentMarkdown: `\`\`\`js\`bad
This line stays plain text.`,
    },
    {
      id: "notes",
      heading: "Notes",
      headingPath: ["Notes"],
      level: 2,
      order: 1,
      rawMarkdown: `## Notes

This heading must still be detected.
`,
      contentMarkdown: "This heading must still be detected.",
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

for (const wrapper of htmlBlockFixtureWrappers) {
  test(`ignores headings inside ${wrapper.label}`, () => {
    const markdown = `## Objective

${wrapper.start}

## Hidden

${wrapper.end}

## Notes

Visible note.
`;

    expect(
      parseMarkdownSections(markdown).sections.map((section) => ({
        heading: section.heading,
        headingPath: section.headingPath,
      })),
    ).toEqual([
      {
        heading: "Objective",
        headingPath: ["Objective"],
      },
      {
        heading: "Notes",
        headingPath: ["Notes"],
      },
    ]);
  });
}

test("does not suppress later headings after inline html tag lines", () => {
  const markdown = `## Objective

<span>Inline note without a closing tag

## Notes

Visible heading parsing should continue.
`;

  expect(parseMarkdownSections(markdown).sections.map((section) => section.heading)).toEqual([
    "Objective",
    "Notes",
  ]);
});

test("ignores headings inside nested wrapper tags until the outer close", () => {
  const markdown = `## Objective

<details>
<details>
</details>
## Hidden
</details>

## Notes

Visible heading parsing should continue.
`;

  expect(parseMarkdownSections(markdown).sections.map((section) => section.heading)).toEqual([
    "Objective",
    "Notes",
  ]);
});

for (const tagName of htmlRawTagNames) {
  test(`resumes heading parsing after single-line <${tagName}> blocks`, () => {
    const markdown = `## Objective

<${tagName}>Hidden content</${tagName}>

## Notes

Visible note.
`;

    expect(
      parseMarkdownSections(markdown).sections.map((section) => ({
        heading: section.heading,
        headingPath: section.headingPath,
      })),
    ).toEqual([
      {
        heading: "Objective",
        headingPath: ["Objective"],
      },
      {
        heading: "Notes",
        headingPath: ["Notes"],
      },
    ]);
  });
}
