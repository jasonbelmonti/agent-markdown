import { expect, test } from "bun:test";

import {
  advanceHtmlBlockState,
  readHtmlBlockStart,
  type HtmlBlockState,
} from "../src/markdown-body/html-blocks.ts";

function expectOpenState(
  line: string,
  expectedState: HtmlBlockState,
  maximumIndentation?: number,
): HtmlBlockState {
  const state = readHtmlBlockStart(line, maximumIndentation);

  expect(state).toEqual(expectedState);

  return state!;
}

test("keeps HTML comments open across blank lines until the terminator", () => {
  const state = expectOpenState("<!--", {
    kind: "terminator-block",
    blockKind: "comment",
    terminator: "-->",
  });

  expect(advanceHtmlBlockState("<!--", state)).toEqual({
    kind: "terminator-block",
    blockKind: "comment",
    terminator: "-->",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "terminator-block",
    blockKind: "comment",
    terminator: "-->",
  });
  expect(advanceHtmlBlockState("-->", state)).toBeNull();
});

test("keeps CDATA blocks open across blank lines until the terminator", () => {
  const state = expectOpenState("<![CDATA[", {
    kind: "terminator-block",
    blockKind: "cdata",
    terminator: "]]>",
  });

  expect(advanceHtmlBlockState("<![CDATA[", state)).toEqual({
    kind: "terminator-block",
    blockKind: "cdata",
    terminator: "]]>",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "terminator-block",
    blockKind: "cdata",
    terminator: "]]>",
  });
  expect(advanceHtmlBlockState("]]>", state)).toBeNull();
});

test("closes declaration blocks when the terminator is observed", () => {
  const state = expectOpenState("<!DOCTYPE html", {
    kind: "terminator-block",
    blockKind: "declaration",
    terminator: ">",
  });

  expect(advanceHtmlBlockState("<!DOCTYPE html", state)).toEqual({
    kind: "terminator-block",
    blockKind: "declaration",
    terminator: ">",
  });
  expect(advanceHtmlBlockState(">", state)).toBeNull();
});

test("closes processing-instruction blocks when the terminator is observed", () => {
  const state = expectOpenState("<?xml version=\"1.0\"", {
    kind: "terminator-block",
    blockKind: "processing-instruction",
    terminator: "?>",
  });

  expect(
    advanceHtmlBlockState("<?xml version=\"1.0\"", state),
  ).toEqual({
    kind: "terminator-block",
    blockKind: "processing-instruction",
    terminator: "?>",
  });
  expect(advanceHtmlBlockState("?>", state)).toBeNull();
});

test("keeps wrapper tags open across blank lines until a matching close tag", () => {
  const state = expectOpenState("<details>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });

  expect(advanceHtmlBlockState("<details>", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("recognizes inline wrapper openers that include trailing summary content", () => {
  const state = expectOpenState("<details><summary>Summary</summary>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });

  expect(
    advanceHtmlBlockState("<details><summary>Summary</summary>", state),
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("keeps generic wrappers open until a matching close tag", () => {
  const state = expectOpenState("<custom-tag>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
  });

  expect(advanceHtmlBlockState("<custom-tag>", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
  });
  expect(advanceHtmlBlockState("</custom-tag>", state)).toBeNull();
});

test("closes raw-tag blocks when their matching close tag appears later", () => {
  const state = expectOpenState("<script>", {
    kind: "matching-tag-block",
    blockKind: "raw-tag",
    tagName: "script",
  });

  expect(advanceHtmlBlockState("<script>", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "raw-tag",
    tagName: "script",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "matching-tag-block",
    blockKind: "raw-tag",
    tagName: "script",
  });
  expect(advanceHtmlBlockState("</script>", state)).toBeNull();
});

test("does not leave single-line raw tags stuck inside html state", () => {
  const state = expectOpenState("<script>hidden</script>", {
    kind: "single-line-structural",
    structuralKind: "inline-matching-tag",
  });

  expect(advanceHtmlBlockState("<script>hidden</script>", state)).toBeNull();
});

test("treats void HTML tags as single-line structural lines", () => {
  const state = expectOpenState("<hr>", {
    kind: "single-line-structural",
    structuralKind: "void-tag",
  });

  expect(advanceHtmlBlockState("<hr>", state)).toBeNull();
});

test("treats standalone closing HTML tags as single-line structural lines", () => {
  const state = expectOpenState("</details>", {
    kind: "single-line-structural",
    structuralKind: "closing-tag",
  });

  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("treats self-closing HTML tags as single-line structural lines", () => {
  const state = expectOpenState("<custom-tag />", {
    kind: "single-line-structural",
    structuralKind: "self-closing-tag",
  });

  expect(advanceHtmlBlockState("<custom-tag />", state)).toBeNull();
});

test("treats same-line wrapper open-close pairs as single-line structural lines", () => {
  const state = expectOpenState("<custom-tag>Hidden</custom-tag>", {
    kind: "single-line-structural",
    structuralKind: "inline-matching-tag",
  });

  expect(
    advanceHtmlBlockState("<custom-tag>Hidden</custom-tag>", state),
  ).toBeNull();
});

test("respects the caller-provided indentation gate", () => {
  expect(readHtmlBlockStart("    <details>")).toBeNull();
  expect(readHtmlBlockStart("    <details>", 4)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
  });
});
