import { parse as parseYaml } from "yaml";

import type { ParsedDocumentFrontmatter } from "./declaration-types.ts";

const LEADING_FRONTMATTER_DELIMITER_PATTERN = /^---\r?\n/;
const CLOSING_FRONTMATTER_DELIMITER_PATTERN = /(?:^|\r?\n)---(?:\r?\n|$)/;

export function parseDocumentFrontmatter(
  markdown: string,
  sourcePath: string,
): ParsedDocumentFrontmatter {
  const openingDelimiterMatch = LEADING_FRONTMATTER_DELIMITER_PATTERN.exec(markdown);

  if (!openingDelimiterMatch) {
    return {
      rawFrontmatter: {},
      rawBodyMarkdown: markdown,
    };
  }

  const remainder = markdown.slice(openingDelimiterMatch[0].length);
  const closingDelimiterMatch = CLOSING_FRONTMATTER_DELIMITER_PATTERN.exec(
    remainder,
  );

  if (!closingDelimiterMatch) {
    throw new Error(
      `Document "${sourcePath}" has malformed YAML frontmatter: missing closing delimiter.`,
    );
  }

  const closingDelimiterIndex = remainder.indexOf(
    "---",
    closingDelimiterMatch.index,
  );
  const rawFrontmatterBlock = remainder.slice(0, closingDelimiterIndex);
  let parsedFrontmatter: unknown;

  try {
    parsedFrontmatter =
      rawFrontmatterBlock.trim().length === 0
        ? {}
        : parseYaml(rawFrontmatterBlock);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Document "${sourcePath}" has malformed YAML frontmatter: ${message}`,
    );
  }

  if (!isRecord(parsedFrontmatter)) {
    throw new Error(`Document "${sourcePath}" frontmatter must parse to a mapping.`);
  }

  return {
    rawFrontmatter: parsedFrontmatter,
    rawBodyMarkdown: stripLeadingNewline(
      remainder.slice(closingDelimiterIndex + "---".length),
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripLeadingNewline(markdown: string): string {
  if (markdown.startsWith("\r\n")) {
    return markdown.slice(2);
  }

  if (markdown.startsWith("\n")) {
    return markdown.slice(1);
  }

  return markdown;
}
