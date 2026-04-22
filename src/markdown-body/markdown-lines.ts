export interface MarkdownLine {
  start: number;
  end: number;
  content: string;
}

export function splitMarkdownLines(markdown: string): MarkdownLine[] {
  if (markdown.length === 0) {
    return [];
  }

  const lines: MarkdownLine[] = [];
  let start = 0;

  while (start < markdown.length) {
    const newlineIndex = markdown.indexOf("\n", start);
    const end = newlineIndex === -1 ? markdown.length : newlineIndex + 1;

    lines.push({
      start,
      end,
      content: markdown.slice(start, end).replace(/\r?\n$/u, ""),
    });

    start = end;
  }

  return lines;
}

export function readLineIndentation(line: string): number {
  return readIndentationWidth(line);
}

export function readIndentationWidth(line: string): number {
  let width = 0;

  for (const character of line) {
    if (character === " ") {
      width += 1;
      continue;
    }

    if (character === "\t") {
      const remainder = width % 4;
      width += remainder === 0 ? 4 : 4 - remainder;
      continue;
    }

    break;
  }

  return width;
}
