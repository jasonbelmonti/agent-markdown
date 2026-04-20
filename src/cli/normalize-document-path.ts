import type { NormalizedDocument } from "../core-model/documents.ts";
import { resolveCliDocumentPath } from "./resolve-cli-document-path.ts";

export interface NormalizeDocumentPathOptions {
  path: string;
  repoRoot?: string;
}

export async function normalizeDocumentPath(
  options: NormalizeDocumentPathOptions,
): Promise<NormalizedDocument> {
  const { normalizedDocument } = await resolveCliDocumentPath(options);

  return normalizedDocument;
}
