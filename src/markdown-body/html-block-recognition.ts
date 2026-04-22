import { readLineIndentation } from "./markdown-lines.ts";
import type {
  HtmlBlockState,
  HtmlTerminator,
  HtmlTerminatorBlockKind,
} from "./html-block-contract.ts";

type RawHtmlTagName = "pre" | "script" | "style" | "textarea";

interface OpeningHtmlTag {
  tagName: string;
  selfClosing: boolean;
}

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
const htmlWrapperTagNames = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "caption",
  "center",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "html",
  "iframe",
  "legend",
  "li",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "ul",
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
const closingHtmlTagPattern = /^<\/([A-Za-z][A-Za-z0-9-]*)\s*>/iu;
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

  if (!isWrapperHtmlTagName(openingTag.tagName)) {
    return null;
  }

  return readMatchingTagBlock(blockContent, "wrapper-tag", openingTag.tagName);
}

export function containsClosingTag(line: string, tagName: string): boolean {
  return new RegExp(
    `</${escapeForRegExp(tagName)}(?:\\s|>)`,
    "iu",
  ).test(line);
}

export function readMatchingTagDepthDelta(line: string, tagName: string): number {
  const matchingTagPattern = new RegExp(
    `<(/?)${escapeForRegExp(tagName)}\\b[^>]*>`,
    "igu",
  );
  let openCount = 0;
  let closeCount = 0;

  for (const match of line.matchAll(matchingTagPattern)) {
    const matchedTag = match[0];

    if (match[1] === "/") {
      closeCount += 1;
      continue;
    }

    if (!matchedTag.trimEnd().endsWith("/>")) {
      openCount += 1;
    }
  }

  return openCount - closeCount;
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
  blockKind: "raw-tag" | "wrapper-tag",
  tagName: string,
): HtmlBlockState {
  if (blockKind === "wrapper-tag") {
    return readMatchingWrapperTagBlock(blockContent, tagName);
  }

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

function readMatchingWrapperTagBlock(
  blockContent: string,
  tagName: string,
): HtmlBlockState {
  return readMatchingTagDepthDelta(blockContent, tagName) === 0
    ? {
        kind: "single-line-structural",
        structuralKind: "inline-matching-tag",
      }
    : {
        kind: "matching-tag-block",
        blockKind: "wrapper-tag",
        tagName,
        nestingDepth: 0,
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

function isWrapperHtmlTagName(tagName: string): boolean {
  return tagName.includes("-") || htmlWrapperTagNames.has(tagName);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
