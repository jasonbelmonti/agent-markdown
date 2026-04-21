import { readLineIndentation } from "./markdown-lines.ts";

type RawHtmlTagName = "pre" | "script" | "style" | "textarea";

export type HtmlBlockState =
  | { kind: "comment" }
  | { kind: "cdata" }
  | { kind: "declaration" }
  | { kind: "processing-instruction" }
  | {
      kind: "raw-tag";
      tagName: RawHtmlTagName;
    }
  | {
      kind: "wrapper-tag";
      tagName: string;
    };

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
const commentHtmlBlockStartPattern = /^<!--/u;
const processingInstructionHtmlBlockStartPattern = /^<\?\w?/u;
const cdataHtmlBlockStartPattern = /^<!\[CDATA\[/u;
const declarationHtmlBlockStartPattern = /^<![A-Z]/iu;
const rawHtmlTagPattern = /^<(pre|script|style|textarea)\b/iu;
const openingHtmlTagPattern = /^<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>\s*$/u;
const selfClosingHtmlTagPattern = /\/>\s*$/u;

export function readHtmlBlockStart(
  line: string,
  maximumIndentation: number = 3,
): HtmlBlockState | null {
  const blockContent = readHtmlBlockContent(line, maximumIndentation);

  if (blockContent === null) {
    return null;
  }

  if (commentHtmlBlockStartPattern.test(blockContent)) {
    return { kind: "comment" };
  }

  if (processingInstructionHtmlBlockStartPattern.test(blockContent)) {
    return { kind: "processing-instruction" };
  }

  if (cdataHtmlBlockStartPattern.test(blockContent)) {
    return { kind: "cdata" };
  }

  if (declarationHtmlBlockStartPattern.test(blockContent)) {
    return { kind: "declaration" };
  }

  const rawTagName = readRawHtmlTagName(blockContent);

  if (rawTagName !== null) {
    return {
      kind: "raw-tag",
      tagName: rawTagName,
    };
  }

  const openingTagName = readOpeningHtmlTagName(blockContent);

  if (
    openingTagName !== null &&
    !htmlVoidTagNames.has(openingTagName)
  ) {
    return {
      kind: "wrapper-tag",
      tagName: openingTagName,
    };
  }

  return null;
}

function readHtmlBlockContent(
  line: string,
  maximumIndentation: number,
): string | null {
  return readLineIndentation(line) <= maximumIndentation ? line.trimStart() : null;
}

function readOpeningHtmlTagName(blockContent: string): string | null {
  if (selfClosingHtmlTagPattern.test(blockContent)) {
    return null;
  }

  const tagName = blockContent.match(openingHtmlTagPattern)?.[1]?.toLowerCase();

  if (tagName === undefined) {
    return null;
  }

  return tagName;
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
    case "comment":
      return line.includes("-->") ? null : state;
    case "cdata":
      return line.includes("]]>") ? null : state;
    case "declaration":
      return line.includes(">") ? null : state;
    case "processing-instruction":
      return line.includes("?>") ? null : state;
    case "raw-tag":
    case "wrapper-tag":
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
