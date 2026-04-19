interface MarkdownLine {
  content: string;
}

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
const htmlBlockStartPattern =
  /^ {0,3}<(?:\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)\b|!--|!\[CDATA\[|\?)/u;

export function containsMarkdownChecklistItem(markdown: string): boolean {
  let openFence: FenceState | null = null;
  const activeListIndentations: number[] = [];
  let previousLineWasBlank = false;
  let previousLineCanContinueParagraph = false;

  for (const line of splitMarkdownLines(markdown)) {
    const lineIsBlank = isBlankLine(line.content);

    if (openFence !== null) {
      if (isClosingFence(line.content, openFence, activeListIndentations)) {
        openFence = null;
      }

      previousLineWasBlank = lineIsBlank;
      previousLineCanContinueParagraph = false;
      continue;
    }

    const openingFence = readOpeningFence(line.content, activeListIndentations);

    if (openingFence !== null) {
      collapseNestedListIndentations(
        activeListIndentations,
        readLineIndentation(line.content),
      );
      openFence = openingFence;
      previousLineWasBlank = false;
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
        collapseNestedListIndentations(activeListIndentations, readLineIndentation(line.content));
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
    const permittedIndentation = isPermittedChecklistIndentation(
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

function readIndentationWidth(indentation: string): number {
  let width = 0;

  for (const character of indentation) {
    if (character === "\t") {
      const remainder = width % 4;
      width += remainder === 0 ? 4 : 4 - remainder;
      continue;
    }

    width += 1;
  }

  return width;
}

function readLineIndentation(line: string): number {
  const matchedIndentation = line.match(/^[ \t]*/u);
  return readIndentationWidth(matchedIndentation?.[0] ?? "");
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

function isPermittedChecklistIndentation(
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
    !startsBlockOutsideParagraph(line) &&
    !isIndentedCodeLine(line, activeListIndentations)
  );
}

function startsBlockOutsideParagraph(line: string): boolean {
  return (
    /^ {0,3}>/u.test(line) ||
    /^ {0,3}#{1,6}(?:[ \t]+|$)/u.test(line) ||
    /^ {0,3}(?:-{3,}|_{3,}|\*{3,})(?:[ \t]*[-_*][ \t]*)*$/u.test(line) ||
    htmlBlockStartPattern.test(line)
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
