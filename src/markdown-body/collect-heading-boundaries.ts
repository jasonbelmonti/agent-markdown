export interface HeadingBoundary {
  start: number;
  contentStart: number;
  heading: string;
  level: number;
}

interface MarkdownLine {
  start: number;
  end: number;
  content: string;
}

interface FenceState {
  marker: "`" | "~";
  length: number;
}

export function collectHeadingBoundaries(markdown: string): HeadingBoundary[] {
  const headings: HeadingBoundary[] = [];
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

    const heading = readAtxHeading(line.content);

    if (heading !== null) {
      headings.push({
        start: line.start,
        contentStart: line.end,
        heading: heading.heading,
        level: heading.level,
      });
    }
  }

  return headings;
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
      start,
      end,
      content: markdown.slice(start, end).replace(/\r?\n$/u, ""),
    });

    start = end;
  }

  return lines;
}

function readAtxHeading(
  line: string,
): {
  heading: string;
  level: number;
} | null {
  const matchedHeading = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u);

  if (matchedHeading === null) {
    return null;
  }

  return {
    heading: normalizeHeadingText(matchedHeading[2]),
    level: matchedHeading[1].length,
  };
}

function normalizeHeadingText(rawHeading: string): string {
  return rawHeading.replace(/[ \t]+#+[ \t]*$/u, "").trim();
}

function readOpeningFence(line: string): FenceState | null {
  const matchedFence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);

  if (matchedFence === null) {
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
