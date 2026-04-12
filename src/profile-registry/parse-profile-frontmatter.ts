import { parse as parseYaml } from "yaml";

const FRONTMATTER_BLOCK_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/;

export interface ParsedProfileFrontmatter {
  rawFrontmatter: Record<string, unknown>;
  rawBodyMarkdown: string;
}

export function parseProfileFrontmatter(
  markdown: string,
  sourcePath: string,
): ParsedProfileFrontmatter {
  const match = FRONTMATTER_BLOCK_PATTERN.exec(markdown);

  if (!match) {
    throw new Error(
      `Profile document "${sourcePath}" is missing a leading YAML frontmatter block.`,
    );
  }

  let parsedFrontmatter: unknown;
  const rawFrontmatterBlock = match[1];

  try {
    parsedFrontmatter = parseYaml(rawFrontmatterBlock ?? "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Profile document "${sourcePath}" has malformed YAML frontmatter: ${message}`,
    );
  }

  if (!isRecord(parsedFrontmatter)) {
    throw new Error(
      `Profile document "${sourcePath}" frontmatter must parse to a mapping.`,
    );
  }

  return {
    rawFrontmatter: parsedFrontmatter,
    rawBodyMarkdown: markdown.slice(match[0].length),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
