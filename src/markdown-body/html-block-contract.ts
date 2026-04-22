export type HtmlTerminatorBlockKind =
  | "comment"
  | "cdata"
  | "declaration"
  | "processing-instruction";
export type HtmlMatchingTagBlockKind = "raw-tag" | "wrapper-tag";
export type HtmlSingleLineStructuralKind =
  | "closing-tag"
  | "inline-matching-tag"
  | "self-closing-tag"
  | "void-tag";
export type HtmlTerminator = "-->" | "]]>" | ">" | "?>";

export type HtmlBlockState =
  | {
      kind: "matching-tag-block";
      blockKind: "raw-tag";
      tagName: string;
    }
  | {
      kind: "matching-tag-block";
      blockKind: "wrapper-tag";
      tagName: string;
      nestingDepth: number;
      commentOpen: boolean;
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
export type PersistentHtmlBlockState = Extract<
  HtmlBlockState,
  { kind: "matching-tag-block" | "terminator-block" }
>;
export interface HtmlBlockStartResult {
  consumedLine: boolean;
  openBlock: PersistentHtmlBlockState | null;
}
