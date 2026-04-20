import type { NormalizedDocument } from "../core-model/documents.ts";
import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";
import { collectDiscoveryHints, readDocumentDeclaration } from "../document-discovery/index.ts";
import { parseMarkdownSections } from "../markdown-body/index.ts";
import { createContentHash } from "../normalization/create-content-hash.ts";
import { composeNormalizedDocument } from "../normalization/index.ts";
import { loadProfileRegistry, resolveProfileReference } from "../profile-registry/index.ts";
import { loadCliTargetDocument } from "./load-cli-target-document.ts";

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
  const repoRoot = options.repoRoot ?? process.cwd();
  const registry = await loadProfileRegistry({ repoRoot });
  const { candidate, markdown } = await loadCliTargetDocument({
    path: options.path,
    repoRoot,
    discoveryHints: collectDiscoveryHints(registry),
  });
  const discoveredDocument = readDocumentDeclaration({
    candidate,
    markdown,
  });
  const profileResolution = resolveProfileReference(registry, {
    doc_spec: discoveredDocument.declaration.docSpec,
    doc_kind: discoveredDocument.declaration.docKind,
    doc_profile: discoveredDocument.declaration.docProfile,
  });
  const parsedBody = parseMarkdownSections(discoveredDocument.source.rawBodyMarkdown);
  const normalizedDocument = composeNormalizedDocument({
    discoveredDocument,
    profileResolution,
    parsedBody,
    contentHash: await createContentHash(markdown),
  });

  return {
    normalizedDocument,
    profileResolution,
  };
}
