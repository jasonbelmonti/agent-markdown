interface MarkdownLine {
  content: string;
}

interface FenceState {
  marker: "`" | "~";
  length: number;
}

const checklistItemPattern =
  /^ {0,3}(?:[*+-]|\d+[.)])[ \t]+\[(?: |x|X)\](?:[ \t]+|$)/u;

export function containsMarkdownChecklistItem(markdown: string): boolean {
  let openFence: FenceState | null = null;

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

    if (checklistItemPattern.test(line.content)) {
      return true;
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
