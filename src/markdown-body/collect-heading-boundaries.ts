import {
  advancePersistentHtmlBlockState,
  isPersistentHtmlBlockState,
  readHtmlBlockStart,
  type PersistentHtmlBlockState,
} from "./html-blocks.ts";
import { splitMarkdownLines } from "./markdown-lines.ts";

export interface HeadingBoundary {
  start: number;
  contentStart: number;
  heading: string;
  level: number;
}

interface FenceState {
  marker: "`" | "~";
  length: number;
}

export function collectHeadingBoundaries(markdown: string): HeadingBoundary[] {
  const headings: HeadingBoundary[] = [];
  let openFence: FenceState | null = null;
  let openHtmlBlock: PersistentHtmlBlockState | null = null;

  for (const line of splitMarkdownLines(markdown)) {
    if (openFence !== null) {
      if (isClosingFence(line.content, openFence)) {
        openFence = null;
      }

      continue;
    }

    if (openHtmlBlock !== null) {
      openHtmlBlock = advancePersistentHtmlBlockState(line.content, openHtmlBlock);
      continue;
    }

    const openingFence = readOpeningFence(line.content);

    if (openingFence !== null) {
      openFence = openingFence;
      continue;
    }

    const openingHtmlBlock = readHtmlBlockStart(line.content);

    if (openingHtmlBlock !== null) {
      openHtmlBlock = isPersistentHtmlBlockState(openingHtmlBlock)
        ? advancePersistentHtmlBlockState(line.content, openingHtmlBlock)
        : null;
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
