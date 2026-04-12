import { parse as parseYaml } from "yaml";

import type { ParsedDocumentFrontmatter } from "./declaration-types.ts";

const FRONTMATTER_BLOCK_PATTERN = /^---\r?\n([\s\S]*?)^---(?:\r?\n)?/m;
const LEADING_FRONTMATTER_DELIMITER_PATTERN = /^---\r?\n/;

export function parseDocumentFrontmatter(
  markdown: string,
  sourcePath: string,
): ParsedDocumentFrontmatter {
  const match = FRONTMATTER_BLOCK_PATTERN.exec(markdown);

  if (!match) {
    if (LEADING_FRONTMATTER_DELIMITER_PATTERN.test(markdown)) {
      throw new Error(
        `Document "${sourcePath}" has malformed YAML frontmatter: missing closing delimiter.`,
      );
    }

    return {
      rawFrontmatter: {},
      rawBodyMarkdown: markdown,
    };
  }

  const rawFrontmatterBlock = match[1] ?? "";
  let parsedFrontmatter: unknown;

  try {
    parsedFrontmatter =
      rawFrontmatterBlock.trim().length === 0
        ? {}
        : (parseYaml(rawFrontmatterBlock) ?? {});
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
    rawBodyMarkdown: markdown.slice(match[0].length),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
