import {
  containsClosingTag,
  readHtmlBlockStart,
} from "./html-block-recognition.ts";
export {
  readHtmlBlockStart,
} from "./html-block-recognition.ts";
export type {
  HtmlBlockStartResult,
  HtmlBlockState,
  PersistentHtmlBlockState,
} from "./html-block-contract.ts";
import type {
  HtmlBlockStartResult,
  HtmlBlockState,
  PersistentHtmlBlockState,
} from "./html-block-contract.ts";

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

export function isPersistentHtmlBlockState(
  state: HtmlBlockState,
): state is PersistentHtmlBlockState {
  return (
    state.kind === "matching-tag-block" ||
    state.kind === "terminator-block"
  );
}

export function advancePersistentHtmlBlockState(
  line: string,
  state: PersistentHtmlBlockState,
): PersistentHtmlBlockState | null {
  switch (state.kind) {
    case "terminator-block":
      return line.includes(state.terminator) ? null : state;
    case "matching-tag-block":
      return containsClosingTag(line, state.tagName) ? null : state;
  }
}

export function consumeOpeningHtmlBlockLine(
  line: string,
  maximumIndentation: number = 3,
): HtmlBlockStartResult {
  const blockState = readHtmlBlockStart(line, maximumIndentation);

  if (blockState === null) {
    return {
      consumedLine: false,
      openBlock: null,
    };
  }

  return {
    consumedLine: true,
    openBlock: isPersistentHtmlBlockState(blockState)
      ? advancePersistentHtmlBlockState(line, blockState)
      : null,
  };
}
