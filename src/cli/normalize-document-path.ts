import type { NormalizedDocument } from "../core-model/documents.ts";
import { collectDiscoveryHints, readDocumentDeclaration } from "../document-discovery/index.ts";
import { parseMarkdownSections } from "../markdown-body/index.ts";
import { composeNormalizedDocument } from "../normalization/index.ts";
import { loadProfileRegistry, resolveProfileReference } from "../profile-registry/index.ts";
import { createContentHash } from "./create-content-hash.ts";
import { loadCliTargetDocument } from "./load-cli-target-document.ts";

export interface NormalizeDocumentPathOptions {
  path: string;
  repoRoot?: string;
}

export async function normalizeDocumentPath(
  options: NormalizeDocumentPathOptions,
): Promise<NormalizedDocument> {
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

  return composeNormalizedDocument({
    discoveredDocument,
    profileResolution,
    parsedBody,
    contentHash: await createContentHash(markdown),
  });
}
