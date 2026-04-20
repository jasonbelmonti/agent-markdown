import type { NormalizedDocument } from "../core-model/documents.ts";
import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";
import { resolveDocument } from "../resolver-core/index.ts";

export interface ResolveCliDocumentPathOptions {
  path: string;
  repoRoot?: string;
}

export interface ResolvedCliDocumentPath {
  normalizedDocument: NormalizedDocument;
  profileResolution: ProfileResolutionResult;
}

export async function resolveCliDocumentPath(
  options: ResolveCliDocumentPathOptions,
): Promise<ResolvedCliDocumentPath> {
  const resolvedDocument = await resolveDocument({
    input: {
      kind: "path",
      path: options.path,
    },
    repoRoot: options.repoRoot,
    mode: "assistive",
  });

  return {
    normalizedDocument: resolvedDocument.normalizedDocument,
    profileResolution: resolvedDocument.profileResolution,
  };
}
