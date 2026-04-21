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
  const state = expectOpenState("<!--", { kind: "comment" });

  expect(advanceHtmlBlockState("<!--", state)).toEqual({ kind: "comment" });
  expect(advanceHtmlBlockState("", state)).toEqual({ kind: "comment" });
  expect(advanceHtmlBlockState("-->", state)).toBeNull();
});

test("keeps CDATA blocks open across blank lines until the terminator", () => {
  const state = expectOpenState("<![CDATA[", { kind: "cdata" });

  expect(advanceHtmlBlockState("<![CDATA[", state)).toEqual({ kind: "cdata" });
  expect(advanceHtmlBlockState("", state)).toEqual({ kind: "cdata" });
  expect(advanceHtmlBlockState("]]>", state)).toBeNull();
});

test("closes declaration blocks when the terminator is observed", () => {
  const state = expectOpenState("<!DOCTYPE html", { kind: "declaration" });

  expect(advanceHtmlBlockState("<!DOCTYPE html", state)).toEqual({
    kind: "declaration",
  });
  expect(advanceHtmlBlockState(">", state)).toBeNull();
});

test("closes processing-instruction blocks when the terminator is observed", () => {
  const state = expectOpenState("<?xml version=\"1.0\"", {
    kind: "processing-instruction",
  });

  expect(
    advanceHtmlBlockState("<?xml version=\"1.0\"", state),
  ).toEqual({
    kind: "processing-instruction",
  });
  expect(advanceHtmlBlockState("?>", state)).toBeNull();
});

test("keeps wrapper tags open across blank lines until a matching close tag", () => {
  const state = expectOpenState("<details>", {
    kind: "wrapper-tag",
    tagName: "details",
  });

  expect(advanceHtmlBlockState("<details>", state)).toEqual({
    kind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("recognizes inline wrapper openers that include trailing summary content", () => {
  const state = expectOpenState("<details><summary>Summary</summary>", {
    kind: "wrapper-tag",
    tagName: "details",
  });

  expect(
    advanceHtmlBlockState("<details><summary>Summary</summary>", state),
  ).toEqual({
    kind: "wrapper-tag",
    tagName: "details",
  });
  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("keeps generic wrappers open until a matching close tag", () => {
  const state = expectOpenState("<custom-tag>", {
    kind: "wrapper-tag",
    tagName: "custom-tag",
  });

  expect(advanceHtmlBlockState("<custom-tag>", state)).toEqual({
    kind: "wrapper-tag",
    tagName: "custom-tag",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "wrapper-tag",
    tagName: "custom-tag",
  });
  expect(advanceHtmlBlockState("</custom-tag>", state)).toBeNull();
});

test("closes raw-tag blocks when their matching close tag appears later", () => {
  const state = expectOpenState("<script>", {
    kind: "raw-tag",
    tagName: "script",
  });

  expect(advanceHtmlBlockState("<script>", state)).toEqual({
    kind: "raw-tag",
    tagName: "script",
  });
  expect(advanceHtmlBlockState("", state)).toEqual({
    kind: "raw-tag",
    tagName: "script",
  });
  expect(advanceHtmlBlockState("</script>", state)).toBeNull();
});

test("does not leave single-line raw tags stuck inside html state", () => {
  const state = expectOpenState("<script>hidden</script>", {
    kind: "raw-tag",
    tagName: "script",
  });

  expect(advanceHtmlBlockState("<script>hidden</script>", state)).toBeNull();
});

test("treats void HTML tags as single-line structural lines", () => {
  const state = expectOpenState("<hr>", { kind: "single-line-tag" });

  expect(advanceHtmlBlockState("<hr>", state)).toBeNull();
});

test("treats standalone closing HTML tags as single-line structural lines", () => {
  const state = expectOpenState("</details>", { kind: "single-line-tag" });

  expect(advanceHtmlBlockState("</details>", state)).toBeNull();
});

test("respects the caller-provided indentation gate", () => {
  expect(readHtmlBlockStart("    <details>")).toBeNull();
  expect(readHtmlBlockStart("    <details>", 4)).toEqual({
    kind: "wrapper-tag",
    tagName: "details",
  });
});
