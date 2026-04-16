import type { NormalizedSection } from "../core-model/index.ts";
import {
  collectHeadingBoundaries,
  type HeadingBoundary,
} from "./collect-heading-boundaries.ts";
import { createSectionId } from "./create-section-id.ts";
import type { ParsedMarkdownBody } from "./types.ts";

interface HeadingPathEntry {
  heading: string;
  level: number;
}

export function parseMarkdownSections(markdown: string): ParsedMarkdownBody {
  return {
    rawMarkdown: markdown,
    sections: buildNormalizedSections(markdown, collectHeadingBoundaries(markdown)),
  };
}

function buildNormalizedSections(
  markdown: string,
  headings: HeadingBoundary[],
): NormalizedSection[] {
  const pathStack: HeadingPathEntry[] = [];
  const usedIds = new Map<string, number>();

  return headings.map((heading, order) => {
    let currentPathEntry = pathStack.at(-1);

    while (currentPathEntry !== undefined && currentPathEntry.level >= heading.level) {
      pathStack.pop();
      currentPathEntry = pathStack.at(-1);
    }

    const headingPath = [...pathStack.map((entry) => entry.heading), heading.heading];
    const nextHeading = headings[order + 1];
    const sectionEnd = nextHeading?.start ?? markdown.length;
    const rawMarkdown = markdown.slice(heading.start, sectionEnd);
    const contentMarkdown = trimSurroundingBlankLines(
      markdown.slice(heading.contentStart, sectionEnd),
    );
    const id = createSectionId(headingPath, order, usedIds);

    pathStack.push({
      heading: heading.heading,
      level: heading.level,
    });

    return {
      id,
      heading: heading.heading,
      headingPath,
      level: heading.level,
      order,
      rawMarkdown,
      contentMarkdown,
    };
  });
}

function trimSurroundingBlankLines(markdown: string): string {
  return markdown
    .replace(/^(?:[ \t]*\r?\n)+/u, "")
    .replace(/(?:\r?\n[ \t]*)+$/u, "");
}
