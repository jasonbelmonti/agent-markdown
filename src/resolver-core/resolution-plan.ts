import type { NormalizedDocumentDeclaration } from "../core-model/documents.ts";
import type {
  ProfileLookupReference,
  ProfileResolutionResult,
} from "../core-model/profile-resolution.ts";
import {
  resolveProfileReference,
  type LoadedProfileRegistry,
} from "../profile-registry/index.ts";
import { isMvpProfileId } from "../profile-registry/profile-identity.ts";
import type { ResolverResolutionSource } from "../resolver-transport/index.ts";
import type { DocumentDiscoveryHint } from "../document-discovery/index.ts";

import { hasDeclarationIdentity } from "./declaration-identity.ts";

export interface ResolutionPlan {
  source: ResolverResolutionSource;
  reference: ProfileLookupReference;
  effectiveProfileId: string | null;
}

export function createResolutionPlan(
  declaration: NormalizedDocumentDeclaration,
  matchedHints: readonly DocumentDiscoveryHint[],
  profileIdOverride: string | null,
): ResolutionPlan {
  const declaredReference = {
    doc_spec: declaration.docSpec,
    doc_kind: declaration.docKind,
    doc_profile: declaration.docProfile,
  } satisfies ProfileLookupReference;

  if (profileIdOverride !== null) {
    return {
      source: "profile_override",
      reference: {
        ...declaredReference,
        doc_profile: profileIdOverride,
      },
      effectiveProfileId: profileIdOverride,
    };
  }

  if (hasDeclarationIdentity(declaration)) {
    return {
      source: "declaration",
      reference: declaredReference,
      effectiveProfileId: declaration.docProfile,
    };
  }

  const fallbackProfileId = matchedHints[0]?.origin.profileId ?? null;

  return {
    source: fallbackProfileId === null ? "declaration" : "discovery_fallback",
    reference: declaredReference,
    effectiveProfileId: fallbackProfileId,
  };
}

export function resolveProfileForPlan(
  registry: LoadedProfileRegistry,
  declaration: NormalizedDocumentDeclaration,
  plan: ResolutionPlan,
): ProfileResolutionResult {
  if (plan.source !== "profile_override") {
    return resolveProfileReference(registry, plan.reference);
  }

  const profileId = plan.reference.doc_profile;

  if (profileId === null || !isMvpProfileId(profileId)) {
    return resolveProfileReference(registry, plan.reference);
  }

  const profile = registry.profilesById[profileId];

  return resolveProfileReference(registry, {
    doc_spec: declaration.docSpec ?? profile.doc_spec,
    doc_kind: declaration.docKind ?? profile.doc_kind,
    doc_profile: profileId,
  });
}
