import type { DocumentDiscoveryCandidate } from "../document-discovery/index.ts";
import type {
  DiscoverRequest,
  DiscoverResponseDocument,
} from "../resolver-transport/index.ts";
import { isMvpProfileId } from "../profile-registry/profile-identity.ts";

import type { ResolverContext } from "./context.ts";
import { hasDeclarationIdentity } from "./declaration-identity.ts";

type ProfilesById = ResolverContext["registry"]["profilesById"];
type DiscoverDeclaration = DiscoverResponseDocument["declaration"];

export function shouldIncludeDiscoveredDocument(
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

  return matchesDeclaredFilters(profilesById, declaration, request);
}

export function matchesDiscoverFilters(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverDeclaration,
  request: DiscoverRequest,
): boolean {
  if (declaration === null) {
    return (
      matchesRequestedDocKindsFromHints(
        profilesById,
        candidate,
        request.docKinds,
      ) &&
      matchesRequestedProfileIdsFromHints(candidate, request.profileIds)
    );
  }

  return matchesDeclaredFilters(profilesById, declaration, request);
}

function matchesDeclaredFilters(
  profilesById: ProfilesById,
  declaration: DiscoverDeclaration,
  request: DiscoverRequest,
): boolean {
  return (
    matchesRequestedDocKindsFromDeclaration(
      profilesById,
      declaration,
      request.docKinds,
    ) &&
    matchesRequestedProfileIdsFromDeclaration(declaration, request.profileIds)
  );
}

function matchesRequestedDocKindsFromDeclaration(
  profilesById: ProfilesById,
  declaration: DiscoverDeclaration,
  requestedDocKinds: readonly string[] | undefined,
): boolean {
  if (!requestedDocKinds || requestedDocKinds.length === 0) {
    return true;
  }

  const declaredDocKind = getDeclaredDocKind(profilesById, declaration);
  return declaredDocKind !== null && requestedDocKinds.includes(declaredDocKind);
}

function matchesRequestedDocKindsFromHints(
  profilesById: ProfilesById,
  candidate: DocumentDiscoveryCandidate,
  requestedDocKinds: readonly string[] | undefined,
): boolean {
  if (!requestedDocKinds || requestedDocKinds.length === 0) {
    return true;
  }

  return candidate.matchedHints.some((hint) =>
    requestedDocKinds.includes(profilesById[hint.origin.profileId].doc_kind),
  );
}

function matchesRequestedProfileIdsFromDeclaration(
  declaration: DiscoverDeclaration,
  requestedProfileIds: readonly string[] | undefined,
): boolean {
  if (!requestedProfileIds || requestedProfileIds.length === 0) {
    return true;
  }

  return (
    typeof declaration?.docProfile === "string" &&
    requestedProfileIds.includes(declaration.docProfile)
  );
}

function matchesRequestedProfileIdsFromHints(
  candidate: DocumentDiscoveryCandidate,
  requestedProfileIds: readonly string[] | undefined,
): boolean {
  if (!requestedProfileIds || requestedProfileIds.length === 0) {
    return true;
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

  if (isMvpProfileId(declaration?.docProfile)) {
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
