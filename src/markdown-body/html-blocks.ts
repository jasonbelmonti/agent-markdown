import {
  containsClosingTag,
  readMatchingTagDepthDelta,
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
      switch (state.blockKind) {
        case "raw-tag":
          return containsClosingTag(line, state.tagName) ? null : state;
        case "wrapper-tag":
          return advanceMatchingWrapperTagBlock(line, state);
      }
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
      switch (state.blockKind) {
        case "raw-tag":
          return containsClosingTag(line, state.tagName) ? null : state;
        case "wrapper-tag":
          return advanceMatchingWrapperTagBlock(line, state);
      }
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

function advanceMatchingWrapperTagBlock(
  line: string,
  state: Extract<HtmlBlockState, { kind: "matching-tag-block"; blockKind: "wrapper-tag" }>,
): Extract<PersistentHtmlBlockState, { kind: "matching-tag-block"; blockKind: "wrapper-tag" }> | null {
  const nextDepth = state.nestingDepth + readMatchingTagDepthDelta(line, state.tagName);

  return nextDepth > 0
    ? {
        ...state,
        nestingDepth: nextDepth,
      }
    : null;
}
