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
    nestingDepth: 0,
    commentOpen: false,
  });

  const openState = advanceHtmlBlockState("<details>", state);

  expect(openState).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("", openState!)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("</details>", openState!)).toBeNull();
});

test("recognizes inline wrapper openers that include trailing summary content", () => {
  const state = expectOpenState("<details><summary>Summary</summary>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 0,
    commentOpen: false,
  });

  const openState = advanceHtmlBlockState("<details><summary>Summary</summary>", state);

  expect(
    openState,
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(
    advanceHtmlBlockState("<details><summary>Summary</summary>", state),
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("</details>", openState!)).toBeNull();
});

test("keeps generic wrappers open until a matching close tag", () => {
  const state = expectOpenState("<custom-tag>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
    nestingDepth: 0,
    commentOpen: false,
  });

  const openState = advanceHtmlBlockState("<custom-tag>", state);

  expect(openState).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("", openState!)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "custom-tag",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("</custom-tag>", openState!)).toBeNull();
});

test("keeps wrapper tags open until the outer matching close when the same tag is nested", () => {
  const state = expectOpenState("<details>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 0,
    commentOpen: false,
  });

  const outerOpenState = advanceHtmlBlockState("<details>", state);

  expect(advanceHtmlBlockState("<details>", outerOpenState!)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 2,
    commentOpen: false,
  });
  expect(
    advanceHtmlBlockState(
      "</details>",
      advanceHtmlBlockState("<details>", outerOpenState!)!,
    ),
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
  expect(advanceHtmlBlockState("</details>", outerOpenState!)).toBeNull();
});

test("treats self-closing raw HTML tags as single-line structural lines", () => {
  const state = expectOpenState("<script />", {
    kind: "single-line-structural",
    structuralKind: "self-closing-tag",
  });

  expect(advanceHtmlBlockState("<script />", state)).toBeNull();
});

test("does not let comment-contained closing tags collapse wrapper state", () => {
  const state = expectOpenState("<details>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 0,
    commentOpen: false,
  });

  expect(
    advanceHtmlBlockState(
      "<!-- </details> -->",
      advanceHtmlBlockState("<details>", state)!,
    ),
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
});

test("does not let comment-contained opening tags increase wrapper depth", () => {
  const state = expectOpenState("<details>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 0,
    commentOpen: false,
  });

  expect(
    advanceHtmlBlockState(
      "<!-- <details> -->",
      advanceHtmlBlockState("<details>", state)!,
    ),
  ).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
});

test("keeps wrapper state stable across multi-line html comments", () => {
  const state = expectOpenState("<details>", {
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 0,
    commentOpen: false,
  });
  const wrapperOpenState = advanceHtmlBlockState("<details>", state)!;
  const commentOpenState = advanceHtmlBlockState("<!-- <details>", wrapperOpenState);

  expect(commentOpenState).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: true,
  });
  expect(advanceHtmlBlockState("still hidden </details>", commentOpenState!)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: true,
  });
  expect(advanceHtmlBlockState("-->", commentOpenState!)).toEqual({
    kind: "matching-tag-block",
    blockKind: "wrapper-tag",
    tagName: "details",
    nestingDepth: 1,
    commentOpen: false,
  });
});

test("does not treat inline html tags as block starters", () => {
  expect(readHtmlBlockStart("<span>note")).toBeNull();
  expect(readHtmlBlockStart("<span>note</span>")).toBeNull();
  expect(readHtmlBlockStart("<em>note</em>")).toBeNull();
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

test("treats closing HTML tags with trailing content as single-line structural lines", () => {
  const state = expectOpenState("</details> trailing note", {
    kind: "single-line-structural",
    structuralKind: "closing-tag",
  });

  expect(advanceHtmlBlockState("</details> trailing note", state)).toBeNull();
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
    nestingDepth: 0,
    commentOpen: false,
  });
});
