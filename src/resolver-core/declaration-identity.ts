import type { NormalizedDocumentDeclaration } from "../core-model/documents.ts";

export function hasDeclarationIdentity(
  declaration: NormalizedDocumentDeclaration,
): boolean {
  return declaration.docSpec !== null || declaration.docProfile !== null;
}

export function hasDeclaredSemantics(
  declaration: NormalizedDocumentDeclaration,
): boolean {
  return (
    declaration.docSpec !== null ||
    declaration.docKind !== null ||
    declaration.docProfile !== null
  );
}
