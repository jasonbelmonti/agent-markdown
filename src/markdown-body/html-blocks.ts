import { readLineIndentation } from "./markdown-lines.ts";

type RawHtmlTagName = "pre" | "script" | "style" | "textarea";

interface OpeningHtmlTag {
  tagName: string;
  selfClosing: boolean;
}

export type HtmlBlockState =
  | { kind: "comment" }
  | { kind: "cdata" }
  | { kind: "declaration" }
  | { kind: "processing-instruction" }
  | { kind: "single-line-tag" }
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

  const openingTag = readOpeningHtmlTag(blockContent);

  if (openingTag === null) {
    return null;
  }

  if (openingTag.selfClosing || htmlVoidTagNames.has(openingTag.tagName)) {
    return { kind: "single-line-tag" };
  }

  return {
    kind: "wrapper-tag",
    tagName: openingTag.tagName,
  };
}

function readHtmlBlockContent(
  line: string,
  maximumIndentation: number,
): string | null {
  return readLineIndentation(line) <= maximumIndentation ? line.trimStart() : null;
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
    selfClosing: matchedTag[2] === "/",
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
    case "comment":
      return line.includes("-->") ? null : state;
    case "cdata":
      return line.includes("]]>") ? null : state;
    case "declaration":
      return line.includes(">") ? null : state;
    case "processing-instruction":
      return line.includes("?>") ? null : state;
    case "single-line-tag":
      return null;
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
