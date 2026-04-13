const LEADING_FRONTMATTER_DELIMITER_PATTERN = /^---\r?\n/;
const CLOSING_FRONTMATTER_DELIMITER_PATTERN = /(?:^|\r?\n)---(?:\r?\n|$)/;

export interface ExtractedDocumentFrontmatterBlock {
  rawFrontmatterBlock: string;
  rawBodyMarkdown: string;
}

export function extractDocumentFrontmatterBlock(
  markdown: string,
  sourcePath: string,
): ExtractedDocumentFrontmatterBlock | null {
  const remainder = readFrontmatterRemainder(markdown);

  if (remainder === null) {
    return null;
  }

  const closingDelimiterIndex = findClosingFrontmatterDelimiterIndex(
    remainder,
    sourcePath,
  );

  return {
    rawFrontmatterBlock: remainder.slice(0, closingDelimiterIndex),
    rawBodyMarkdown: stripLeadingNewline(
      remainder.slice(closingDelimiterIndex + "---".length),
    ),
  };
}

function readFrontmatterRemainder(markdown: string): string | null {
  const openingDelimiterMatch = LEADING_FRONTMATTER_DELIMITER_PATTERN.exec(markdown);

  if (!openingDelimiterMatch) {
    return null;
  }

  return markdown.slice(openingDelimiterMatch[0].length);
}

function findClosingFrontmatterDelimiterIndex(
  remainder: string,
  sourcePath: string,
): number {
  const closingDelimiterMatch = CLOSING_FRONTMATTER_DELIMITER_PATTERN.exec(
    remainder,
  );

  if (!closingDelimiterMatch) {
    throw new Error(
      `Document "${sourcePath}" has malformed YAML frontmatter: missing closing delimiter.`,
    );
  }

  return remainder.indexOf("---", closingDelimiterMatch.index);
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
