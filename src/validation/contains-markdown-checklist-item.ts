interface MarkdownLine {
  content: string;
}

interface FenceState {
  marker: "`" | "~";
  length: number;
}

interface ListItemMatch {
  indentation: number;
  isChecklistItem: boolean;
}

const listItemPattern =
  /^([ \t]*)(?:[*+-]|\d+[.)])[ \t]+(\[(?: |x|X)\](?:[ \t]+|$))?/u;

export function containsMarkdownChecklistItem(markdown: string): boolean {
  let openFence: FenceState | null = null;
  const activeListIndentations: number[] = [];

  for (const line of splitMarkdownLines(markdown)) {
    if (openFence !== null) {
      if (isClosingFence(line.content, openFence)) {
        openFence = null;
      }

      continue;
    }

    const openingFence = readOpeningFence(line.content);

    if (openingFence !== null) {
      openFence = openingFence;
      continue;
    }

    const matchedListItem = readListItem(line.content);

    if (matchedListItem === null) {
      if (!isBlankLine(line.content)) {
        collapseNestedListIndentations(activeListIndentations, -1);
      }

      continue;
    }

    collapseNestedListIndentations(
      activeListIndentations,
      matchedListItem.indentation,
    );
    const permittedIndentation = isPermittedChecklistIndentation(
      matchedListItem.indentation,
      activeListIndentations,
    );

    if (
      matchedListItem.isChecklistItem &&
      permittedIndentation
    ) {
      return true;
    }

    if (
      permittedIndentation &&
      activeListIndentations.at(-1) !== matchedListItem.indentation
    ) {
      activeListIndentations.push(matchedListItem.indentation);
    }
  }

  return false;
}

function splitMarkdownLines(markdown: string): MarkdownLine[] {
  if (markdown.length === 0) {
    return [];
  }

  const lines: MarkdownLine[] = [];
  let start = 0;

  while (start < markdown.length) {
    const newlineIndex = markdown.indexOf("\n", start);
    const end = newlineIndex === -1 ? markdown.length : newlineIndex + 1;

    lines.push({
      content: markdown.slice(start, end).replace(/\r?\n$/u, ""),
    });

    start = end;
  }

  return lines;
}

function readListItem(line: string): ListItemMatch | null {
  const matchedListItem = line.match(listItemPattern);

  if (matchedListItem === null) {
    return null;
  }

  return {
    indentation: readIndentationWidth(matchedListItem[1]),
    isChecklistItem: matchedListItem[2] !== undefined,
  };
}

function readOpeningFence(line: string): FenceState | null {
  const matchedFence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);

  if (matchedFence === null) {
    return null;
  }

  if (matchedFence[1][0] === "`" && matchedFence[2].includes("`")) {
    return null;
  }

  return {
    marker: matchedFence[1][0] as FenceState["marker"],
    length: matchedFence[1].length,
  };
}

function isClosingFence(line: string, fence: FenceState): boolean {
  const matchedFence = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/u);

  return (
    matchedFence !== null &&
    matchedFence[1][0] === fence.marker &&
    matchedFence[1].length >= fence.length
  );
}

function readIndentationWidth(indentation: string): number {
  let width = 0;

  for (const character of indentation) {
    width += character === "\t" ? 4 : 1;
  }

  return width;
}

function collapseNestedListIndentations(
  activeListIndentations: number[],
  indentation: number,
): void {
  while (
    activeListIndentations.length > 0 &&
    activeListIndentations.at(-1)! > indentation
  ) {
    activeListIndentations.pop();
  }
}

function isPermittedChecklistIndentation(
  indentation: number,
  activeListIndentations: number[],
): boolean {
  return (
    indentation <= 3 ||
    activeListIndentations.some((activeIndentation) => activeIndentation < indentation)
  );
}

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}
