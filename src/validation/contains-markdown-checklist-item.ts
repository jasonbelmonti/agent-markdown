import {
  advancePersistentHtmlBlockState,
  consumeOpeningHtmlBlockLine,
  type HtmlBlockStartResult,
  type PersistentHtmlBlockState,
} from "../markdown-body/html-blocks.ts";
import {
  readIndentationWidth,
  readLineIndentation,
  splitMarkdownLines,
} from "../markdown-body/markdown-lines.ts";

interface FenceState {
  marker: "`" | "~";
  length: number;
}

interface ListItemMatch {
  markerIndentation: number;
  contentIndentation: number;
  isChecklistItem: boolean;
}

const listItemPattern =
  /^([ \t]*)([*+-]|\d+[.)])([ \t]+)(\[(?: |x|X)\](?:[ \t]+|$))?/u;

export function containsMarkdownChecklistItem(markdown: string): boolean {
  let openFence: FenceState | null = null;
  let openHtmlBlock: PersistentHtmlBlockState | null = null;
  const activeListIndentations: number[] = [];
  let previousLineWasBlank = false;
  let previousLineCanContinueParagraph = false;

  for (const line of splitMarkdownLines(markdown)) {
    const lineIsBlank = isBlankLine(line.content);
    const lineIndentation = readLineIndentation(line.content);

    if (openFence !== null) {
      if (isClosingFence(line.content, openFence, activeListIndentations)) {
        openFence = null;
      }

      previousLineWasBlank = lineIsBlank;
      previousLineCanContinueParagraph = false;
      continue;
    }

    if (openHtmlBlock !== null) {
      if (!lineIsBlank) {
        collapseNestedListIndentations(activeListIndentations, lineIndentation);
      }
      openHtmlBlock = advancePersistentHtmlBlockState(line.content, openHtmlBlock);
      previousLineWasBlank = lineIsBlank;
      previousLineCanContinueParagraph = false;
      continue;
    }

    const openingFence = readOpeningFence(line.content, activeListIndentations);

    if (openingFence !== null) {
      collapseNestedListIndentations(
        activeListIndentations,
        lineIndentation,
      );
      openFence = openingFence;
      previousLineWasBlank = false;
      previousLineCanContinueParagraph = false;
      continue;
    }

    const openingHtmlBlock = consumeOpeningHtmlBlock(
      line.content,
      lineIndentation,
      activeListIndentations,
    );

    if (openingHtmlBlock.consumedLine) {
      collapseNestedListIndentations(activeListIndentations, lineIndentation);
      openHtmlBlock = openingHtmlBlock.openBlock;
      previousLineWasBlank = lineIsBlank;
      previousLineCanContinueParagraph = false;
      continue;
    }

    const matchedListItem = readListItem(line.content);

    if (matchedListItem === null) {
      if (
        !lineIsBlank &&
        !isLazyContinuationLine(
          line.content,
          activeListIndentations,
          previousLineWasBlank,
          previousLineCanContinueParagraph,
        )
      ) {
        collapseNestedListIndentations(activeListIndentations, lineIndentation);
      }

      previousLineWasBlank = lineIsBlank;
      previousLineCanContinueParagraph =
        !lineIsBlank &&
        isParagraphContinuationCandidate(line.content, activeListIndentations);
      continue;
    }

    collapseNestedListIndentations(
      activeListIndentations,
      matchedListItem.markerIndentation,
    );
    const permittedIndentation = isPermittedContainerIndentation(
      matchedListItem.markerIndentation,
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
      activeListIndentations.at(-1) !== matchedListItem.contentIndentation
    ) {
      activeListIndentations.push(matchedListItem.contentIndentation);
    }

    previousLineWasBlank = false;
    previousLineCanContinueParagraph = true;
  }

  return false;
}

function readListItem(line: string): ListItemMatch | null {
  const matchedListItem = line.match(listItemPattern);

  if (matchedListItem === null) {
    return null;
  }

  const markerIndentation = readIndentationWidth(matchedListItem[1]);
  const contentIndentation =
    markerIndentation +
    matchedListItem[2].length +
    readIndentationWidth(matchedListItem[3]);

  return {
    markerIndentation,
    contentIndentation,
    isChecklistItem: matchedListItem[4] !== undefined,
  };
}

function readOpeningFence(
  line: string,
  activeListIndentations: number[],
): FenceState | null {
  const matchedFence = line.match(/^([ \t]*)(`{3,}|~{3,})(.*)$/u);

  if (matchedFence === null) {
    return null;
  }

  const indentation = readIndentationWidth(matchedFence[1]);

  if (!isPermittedContainerIndentation(indentation, activeListIndentations)) {
    return null;
  }

  if (matchedFence[2][0] === "`" && matchedFence[3].includes("`")) {
    return null;
  }

  return {
    marker: matchedFence[2][0] as FenceState["marker"],
    length: matchedFence[2].length,
  };
}

function isClosingFence(
  line: string,
  fence: FenceState,
  activeListIndentations: number[],
): boolean {
  const matchedFence = line.match(/^([ \t]*)(`{3,}|~{3,})[ \t]*$/u);

  if (matchedFence === null) {
    return false;
  }

  const indentation = readIndentationWidth(matchedFence[1]);

  return (
    isPermittedContainerIndentation(indentation, activeListIndentations) &&
    matchedFence[2][0] === fence.marker &&
    matchedFence[2].length >= fence.length
  );
}

function isLazyContinuationLine(
  line: string,
  activeListIndentations: number[],
  previousLineWasBlank: boolean,
  previousLineCanContinueParagraph: boolean,
): boolean {
  if (
    previousLineWasBlank ||
    !previousLineCanContinueParagraph ||
    activeListIndentations.length === 0
  ) {
    return false;
  }

  return (
    readLineIndentation(line) < activeListIndentations.at(-1)! &&
    isParagraphContinuationCandidate(line, activeListIndentations)
  );
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

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

function isPermittedContainerIndentation(
  indentation: number,
  activeListIndentations: number[],
): boolean {
  return (
    indentation <= 3 ||
    activeListIndentations.some((activeIndentation) =>
      isNestedWithinListContent(indentation, activeIndentation),
    )
  );
}

function consumeOpeningHtmlBlock(
  line: string,
  indentation: number,
  activeListIndentations: number[],
): HtmlBlockStartResult {
  return isPermittedContainerIndentation(indentation, activeListIndentations)
    ? consumeOpeningHtmlBlockLine(line, indentation)
    : {
        consumedLine: false,
        openBlock: null,
      };
}

function isNestedWithinListContent(
  indentation: number,
  activeIndentation: number,
): boolean {
  return indentation >= activeIndentation && indentation < activeIndentation + 4;
}

function isParagraphContinuationCandidate(
  line: string,
  activeListIndentations: number[],
): boolean {
  return (
    !startsBlockOutsideParagraph(line, activeListIndentations) &&
    !isIndentedCodeLine(line, activeListIndentations)
  );
}

function startsBlockOutsideParagraph(
  line: string,
  activeListIndentations: number[],
): boolean {
  const indentation = readLineIndentation(line);

  return (
    /^ {0,3}>/u.test(line) ||
    /^ {0,3}#{1,6}(?:[ \t]+|$)/u.test(line) ||
    /^ {0,3}(?:-{3,}|_{3,}|\*{3,})(?:[ \t]*[-_*][ \t]*)*$/u.test(line) ||
    consumeOpeningHtmlBlock(line, indentation, activeListIndentations).consumedLine
  );
}

function isIndentedCodeLine(
  line: string,
  activeListIndentations: number[],
): boolean {
  const indentation = readLineIndentation(line);

  if (activeListIndentations.length === 0) {
    return indentation >= 4;
  }

  return indentation >= activeListIndentations.at(-1)! + 4;
}
