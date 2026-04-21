import type { DocumentDiscoveryCandidate } from "../document-discovery/index.ts";
import type {
  DiscoverRequest,
  DiscoverResponse,
  DiscoverResponseDocument,
  DiscoveredDocumentResolvedSummary,
} from "../resolver-transport/index.ts";
import { isMvpProfileId } from "../profile-registry/profile-identity.ts";

import {
  loadResolverContext,
  type ResolverContext,
} from "./context.ts";
import {
  prepareResolverDocument,
  type PreparedResolverDocument,
} from "./prepared-document.ts";
import {
  hasDeclarationIdentity,
  hasDeclaredSemantics,
} from "./declaration-identity.ts";
import { listScopedMarkdownPaths } from "./discover-document-paths.ts";
import { resolvePreparedDocument } from "./resolve-document.ts";

type ProfilesById = ResolverContext["registry"]["profilesById"];
type DiscoverDeclaration = DiscoverResponseDocument["declaration"];

export async function discoverDocuments(
  request: DiscoverRequest,
): Promise<DiscoverResponse> {
  const context = await loadResolverContext({ repoRoot: request.repoRoot });
  const markdownPaths = await listScopedMarkdownPaths(
    context.repoRoot,
    request.scopePaths,
  );
  const documents: DiscoverResponse["documents"] = [];

  for (const absolutePath of markdownPaths) {
    const preparedDocument = await tryPrepareDiscoverDocument(
      absolutePath,
      context,
    );

    if (preparedDocument === null) {
      continue;
    }

    if (isProfileSpecification(preparedDocument)) {
      continue;
    }

    const declaration = toDiscoverDeclaration(preparedDocument);
    const matchesFilters = matchesDiscoverFilters(
      context.registry.profilesById,
      preparedDocument.candidate,
      declaration,
      request,
    );

    if (
      !shouldIncludeDocument(
        context.registry.profilesById,
        preparedDocument.candidate,
        declaration,
        request,
        matchesFilters,
      )
    ) {
      continue;
    }

    if (!matchesFilters) {
      continue;
    }

    documents.push({
      path: preparedDocument.candidate.path,
      discoveryMatches: [...preparedDocument.candidate.discoveryMatches],
      declaration,
      resolved:
        request.mode === undefined
          ? null
          : await createResolvedSummary(
              context,
              preparedDocument,
              request.mode,
            ),
    });
  }

  return { documents };
}

async function tryPrepareDiscoverDocument(
  absolutePath: string,
  context: ResolverContext,
): Promise<PreparedResolverDocument | null> {
  try {
    return await prepareResolverDocument({
      input: {
        kind: "path",
        path: absolutePath,
      },
      repoRoot: context.repoRoot,
      discoveryHints: context.discoveryHints,
    });
  } catch (error) {
    if (isMalformedFrontmatterError(error)) {
      return null;
    }

    throw error;
  }
}

async function createResolvedSummary(
  context: ResolverContext,
  preparedDocument: PreparedResolverDocument,
  mode: NonNullable<DiscoverRequest["mode"]>,
): Promise<DiscoveredDocumentResolvedSummary> {
  const response = await resolvePreparedDocument(
    context,
    preparedDocument,
    { mode },
  );

  return {
    conformance: response.normalizedDocument.validation.conformance,
    profile: {
      resolved: response.profileResolution.resolved,
      profileId: response.profileResolution.profile_id,
      profilePath: response.profileResolution.profile_path,
      reason: response.profileResolution.reason,
    },
    resolution: response.resolution,
    trust: response.trust,
    guidance: response.guidance,
  };
}

function shouldIncludeDocument(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  request: DiscoverRequest,
  matchesFilters: boolean,
): boolean {
  if (
    (declaration !== null && hasDeclarationIdentity(declaration)) ||
    candidate.discoveryMatches.length > 0
  ) {
    return true;
  }

  if (!matchesFilters || declaration === null || !hasDiscoverFilters(request)) {
    return false;
  }

  return matchesDeclaredFilters(profilesById, candidate, declaration, request);
}

function toDiscoverDeclaration(
  preparedDocument: PreparedResolverDocument,
): DiscoverDeclaration {
  const declaration = preparedDocument.discoveredDocument.declaration;

  return hasDeclaredSemantics(declaration) ? declaration : null;
}

function matchesDiscoverFilters(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  request: DiscoverRequest,
): boolean {
  return (
    matchesRequestedDocKinds(
      profilesById,
      candidate,
      declaration,
      request.docKinds,
      true,
    ) &&
    matchesRequestedProfileIds(
      profilesById,
      candidate,
      declaration,
      request.profileIds,
      true,
    )
  );
}

function matchesDeclaredFilters(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  request: DiscoverRequest,
): boolean {
  return (
    matchesRequestedDocKinds(
      profilesById,
      candidate,
      declaration,
      request.docKinds,
      false,
    ) &&
    matchesRequestedProfileIds(
      profilesById,
      candidate,
      declaration,
      request.profileIds,
      false,
    )
  );
}

function matchesRequestedDocKinds(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  requestedDocKinds: readonly string[] | undefined,
  allowHintFallback: boolean,
): boolean {
  if (!requestedDocKinds || requestedDocKinds.length === 0) {
    return true;
  }

  const declaredDocKind = getDeclaredDocKind(profilesById, declaration);

  if (declaredDocKind !== null) {
    return requestedDocKinds.includes(declaredDocKind);
  }

  if (!allowHintFallback) {
    return false;
  }

  return candidate.matchedHints.some((hint) =>
    requestedDocKinds.includes(profilesById[hint.origin.profileId].doc_kind),
  );
}

function matchesRequestedProfileIds(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  requestedProfileIds: readonly string[] | undefined,
  allowHintFallback: boolean,
): boolean {
  if (!requestedProfileIds || requestedProfileIds.length === 0) {
    return true;
  }

  if (typeof declaration?.docProfile === "string") {
    return requestedProfileIds.includes(declaration.docProfile);
  }

  if (typeof declaration?.docKind === "string") {
    if (!allowHintFallback) {
      return false;
    }

    return candidate.matchedHints.some((hint) =>
      requestedProfileIds.includes(hint.origin.profileId) &&
      profilesById[hint.origin.profileId].doc_kind === declaration.docKind,
    );
  }

  if (!allowHintFallback) {
    return false;
  }

  return candidate.matchedHints.some((hint) =>
    requestedProfileIds.includes(hint.origin.profileId),
  );
}

function getDeclaredDocKind(
  profilesById: ProfilesById,
  declaration: DiscoverDeclaration,
): string | null {
  if (typeof declaration?.docKind === "string") {
    return declaration.docKind;
  }

  if (
    isMvpProfileId(declaration?.docProfile)
  ) {
    return profilesById[declaration.docProfile].doc_kind;
  }

  return null;
}

function hasDiscoverFilters(request: DiscoverRequest): boolean {
  return Boolean(
    (request.docKinds && request.docKinds.length > 0) ||
      (request.profileIds && request.profileIds.length > 0),
  );
}

function isProfileSpecification(
  preparedDocument: PreparedResolverDocument,
): boolean {
  return preparedDocument.discoveredDocument.source.path.endsWith(".profile.md");
}

function isMalformedFrontmatterError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("has malformed YAML frontmatter") ||
    error.message.includes("frontmatter must parse to a mapping")
  );
}
