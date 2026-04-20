export type ResolverDocumentInput =
  | {
      kind: "path";
      path: string;
    }
  | {
      kind: "content";
      content: string;
      sourcePath?: string;
    };
