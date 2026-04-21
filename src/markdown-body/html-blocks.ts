import { readLineIndentation } from "./markdown-lines.ts";

type RawHtmlTagName = "pre" | "script" | "style" | "textarea";
type HtmlTerminatorBlockKind =
  | "comment"
  | "cdata"
  | "declaration"
  | "processing-instruction";
type HtmlMatchingTagBlockKind = "raw-tag" | "wrapper-tag";
type HtmlSingleLineStructuralKind =
  | "closing-tag"
  | "inline-matching-tag"
  | "self-closing-tag"
  | "void-tag";
type HtmlTerminator = "-->" | "]]>" | ">" | "?>";

interface OpeningHtmlTag {
  tagName: string;
  selfClosing: boolean;
}

export type HtmlBlockState =
  | {
      kind: "matching-tag-block";
      blockKind: HtmlMatchingTagBlockKind;
      tagName: string;
    }
  | {
      kind: "terminator-block";
      blockKind: HtmlTerminatorBlockKind;
      terminator: HtmlTerminator;
    }
  | {
      kind: "single-line-structural";
      structuralKind: HtmlSingleLineStructuralKind;
    };

interface TerminatorBlockDefinition {
  blockKind: HtmlTerminatorBlockKind;
  startPattern: RegExp;
  terminator: HtmlTerminator;
}

const htmlVoidTagNames = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const terminatorBlockDefinitions: TerminatorBlockDefinition[] = [
  {
    blockKind: "comment",
    startPattern: /^<!--/u,
    terminator: "-->",
  },
  {
    blockKind: "processing-instruction",
    startPattern: /^<\?\w?/u,
    terminator: "?>",
  },
  {
    blockKind: "cdata",
    startPattern: /^<!\[CDATA\[/u,
    terminator: "]]>",
  },
  {
    blockKind: "declaration",
    startPattern: /^<![A-Z]/iu,
    terminator: ">",
  },
];
const closingHtmlTagPattern = /^<\/([A-Za-z][A-Za-z0-9-]*)\s*>\s*$/iu;
const rawHtmlTagPattern = /^<(pre|script|style|textarea)\b/iu;
const openingHtmlTagPattern =
  /^<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?\s*(\/?)>/iu;

export function readHtmlBlockStart(
  line: string,
  maximumIndentation: number = 3,
): HtmlBlockState | null {
  const blockContent = readHtmlBlockContent(line, maximumIndentation);

  if (blockContent === null) {
    return null;
  }

  const terminatorBlock = readTerminatorBlockStart(blockContent);

  if (terminatorBlock !== null) {
    return terminatorBlock;
  }

  if (readClosingHtmlTagName(blockContent) !== null) {
    return {
      kind: "single-line-structural",
      structuralKind: "closing-tag",
    };
  }

  const rawTagName = readRawHtmlTagName(blockContent);

  if (rawTagName !== null) {
    return readMatchingTagBlock(blockContent, "raw-tag", rawTagName);
  }

  const openingTag = readOpeningHtmlTag(blockContent);

  if (openingTag === null) {
    return null;
  }

  if (openingTag.selfClosing) {
    return {
      kind: "single-line-structural",
      structuralKind: "self-closing-tag",
    };
  }

  if (htmlVoidTagNames.has(openingTag.tagName)) {
    return {
      kind: "single-line-structural",
      structuralKind: "void-tag",
    };
  }

  return readMatchingTagBlock(blockContent, "wrapper-tag", openingTag.tagName);
}

function readTerminatorBlockStart(blockContent: string): HtmlBlockState | null {
  for (const definition of terminatorBlockDefinitions) {
    if (definition.startPattern.test(blockContent)) {
      return {
        kind: "terminator-block",
        blockKind: definition.blockKind,
        terminator: definition.terminator,
      };
    }
  }

  return null;
}

function readMatchingTagBlock(
  blockContent: string,
  blockKind: HtmlMatchingTagBlockKind,
  tagName: string,
): HtmlBlockState {
  return containsClosingTag(blockContent, tagName)
    ? {
        kind: "single-line-structural",
        structuralKind: "inline-matching-tag",
      }
    : {
        kind: "matching-tag-block",
        blockKind,
        tagName,
      };
}

function readClosingHtmlTagName(blockContent: string): string | null {
  return closingHtmlTagPattern.exec(blockContent)?.[1]?.toLowerCase() ?? null;
}

function readHtmlBlockContent(
  line: string,
  maximumIndentation: number,
): string | null {
  return readLineIndentation(line) <= maximumIndentation
    ? line.trimStart()
    : null;
}

function readOpeningHtmlTag(blockContent: string): OpeningHtmlTag | null {
  const matchedTag = blockContent.match(openingHtmlTagPattern);

  if (matchedTag === null) {
    return null;
  }

  const tagName = matchedTag[1]?.toLowerCase();

  if (tagName === undefined) {
    return null;
  }

  return {
    tagName,
    selfClosing: matchedTag[0].trimEnd().endsWith("/>"),
  };
}

function readRawHtmlTagName(blockContent: string): RawHtmlTagName | null {
  const matchedTagName = blockContent.match(rawHtmlTagPattern)?.[1]?.toLowerCase();

  switch (matchedTagName) {
    case "pre":
    case "script":
    case "style":
    case "textarea":
      return matchedTagName;
    default:
      return null;
  }
}

export function advanceHtmlBlockState(
  line: string,
  state: HtmlBlockState,
): HtmlBlockState | null {
  switch (state.kind) {
    case "single-line-structural":
      return null;
    case "terminator-block":
      return line.includes(state.terminator) ? null : state;
    case "matching-tag-block":
      return containsClosingTag(line, state.tagName) ? null : state;
  }
}

function containsClosingTag(line: string, tagName: string): boolean {
  return new RegExp(
    `</${escapeForRegExp(tagName)}(?:\\s|>)`,
    "iu",
  ).test(line);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
