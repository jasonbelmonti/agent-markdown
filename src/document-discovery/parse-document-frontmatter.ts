import type { ParsedDocumentFrontmatter } from "./declaration-types.ts";
import { decodeDocumentFrontmatter } from "./decode-document-frontmatter.ts";
import { extractDocumentFrontmatterBlock } from "./extract-document-frontmatter-block.ts";

export function parseDocumentFrontmatter(
  markdown: string,
  sourcePath: string,
): ParsedDocumentFrontmatter {
  const extractedFrontmatter = extractDocumentFrontmatterBlock(markdown, sourcePath);

  if (extractedFrontmatter === null) {
    return {
      rawFrontmatter: {},
      rawBodyMarkdown: markdown,
    };
  }

  return {
    rawFrontmatter: decodeDocumentFrontmatter(
      extractedFrontmatter.rawFrontmatterBlock,
      sourcePath,
    ),
    rawBodyMarkdown: extractedFrontmatter.rawBodyMarkdown,
  };
}
