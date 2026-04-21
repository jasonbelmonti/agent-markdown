import { parseMarkdownSections } from "../markdown-body/index.ts";
import { createContentHash } from "../normalization/create-content-hash.ts";
import { composeNormalizedDocument } from "../normalization/index.ts";
import type {
  ResolveRequest,
  ResolveResponse,
} from "../resolver-transport/index.ts";

import { loadResolverContext, type ResolverContext } from "./context.ts";
import { prepareResolverDocument, type PreparedResolverDocument } from "./prepared-document.ts";
import {
  createResolutionPlan,
  resolveProfileForPlan,
} from "./resolution-plan.ts";
import {
  createRuntimeResolution,
  createRuntimeTrustAndGuidance,
} from "./runtime-metadata.ts";

export async function resolveDocument(
  request: ResolveRequest,
): Promise<ResolveResponse> {
  const context = await loadResolverContext({ repoRoot: request.repoRoot });
  const preparedDocument = await prepareResolverDocument({
    input: request.input,
    repoRoot: context.repoRoot,
    discoveryHints: context.discoveryHints,
  });

  return resolvePreparedDocument(context, preparedDocument, request);
}

export async function resolvePreparedDocument(
  context: ResolverContext,
  preparedDocument: PreparedResolverDocument,
  request: Pick<ResolveRequest, "mode" | "profileIdOverride">,
): Promise<ResolveResponse> {
  const requestedProfileId = request.profileIdOverride ?? null;
  const declaration = preparedDocument.discoveredDocument.declaration;
  const resolutionPlan = createResolutionPlan(
    declaration,
    preparedDocument.candidate.matchedHints,
    requestedProfileId,
  );
  const profileResolution = resolveProfileForPlan(
    context.registry,
    declaration,
    resolutionPlan,
  );
  const parsedBody = parseMarkdownSections(
    preparedDocument.discoveredDocument.source.rawBodyMarkdown,
  );
  const normalizedDocument = composeNormalizedDocument({
    discoveredDocument: preparedDocument.discoveredDocument,
    profileResolution,
    parsedBody,
    contentHash: await createContentHash(preparedDocument.markdown),
  });
  const resolution = createRuntimeResolution({
    mode: request.mode,
    source: resolutionPlan.source,
    requestedProfileId,
    effectiveProfileId: resolutionPlan.effectiveProfileId,
  });
  const { trust, guidance } = createRuntimeTrustAndGuidance(
    normalizedDocument.validation.conformance,
    request.mode,
  );

  return {
    normalizedDocument,
    profileResolution,
    resolution,
    trust,
    guidance,
  };
}
