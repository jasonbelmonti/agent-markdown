import { parse as parseYaml } from "yaml";

export function decodeDocumentFrontmatter(
  rawFrontmatterBlock: string,
  sourcePath: string,
): Record<string, unknown> {
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

  return parsedFrontmatter;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
