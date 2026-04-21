import type {
  ResolverDiscoveryHint,
  SniffRecommendation,
  SniffRequest,
  SniffResponse,
} from "../resolver-transport/index.ts";
import type { DocumentDiscoveryHint } from "../document-discovery/index.ts";

import { loadResolverContext } from "./context.ts";
import { hasDeclarationIdentity } from "./declaration-identity.ts";
import { prepareResolverDocument } from "./prepared-document.ts";

export async function sniffDocument(
  request: SniffRequest,
): Promise<SniffResponse> {
  const context = await loadResolverContext({ repoRoot: request.repoRoot });
  const preparedDocument = await prepareResolverDocument({
    input: request.input,
    repoRoot: context.repoRoot,
    discoveryHints: context.discoveryHints,
  });

  return {
    frontmatterFound: preparedDocument.frontmatterFound,
    declaration: preparedDocument.discoveredDocument.declaration,
    matchedHints: preparedDocument.candidate.matchedHints.map(toResolverHint),
    recommendation: createRecommendation(
      preparedDocument.discoveredDocument.declaration,
      preparedDocument.candidate.matchedHints.length > 0,
    ),
  };
}

function createRecommendation(
  declaration: SniffResponse["declaration"],
  hasMatchedHints: boolean,
): SniffRecommendation {
  if (hasDeclarationIdentity(declaration)) {
    return "resolve";
  }

  return hasMatchedHints ? "resolve_informational" : "ignore";
}

function toResolverHint(
  hint: DocumentDiscoveryHint,
): ResolverDiscoveryHint {
  return {
    kind: hint.kind,
    value: hint.value,
    origin: {
      profileId: hint.origin.profileId,
      profilePath: hint.origin.profilePath,
    },
  };
}
