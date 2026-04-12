import type {
  ProfileLookupReference,
  ProfileResolutionCompatibility,
  ProfileResolutionReason,
  ProfileResolutionResult,
} from "../core-model/profile-resolution.ts";
import type { LoadedProfileDocument } from "../core-model/profiles.ts";
import type { LoadedProfileRegistry } from "./load-profile-registry.ts";
import { isMvpProfileId } from "./profile-identity.ts";

export function resolveProfileReference(
  registry: LoadedProfileRegistry,
  reference: ProfileLookupReference,
): ProfileResolutionResult {
  if (reference.doc_profile === null) {
    return buildResolutionResult(reference, {
      profile: null,
      reason: "undeclared_profile",
      compatibility: null,
    });
  }

  if (!isMvpProfileId(reference.doc_profile)) {
    return buildResolutionResult(reference, {
      profile: null,
      reason: "unknown_profile",
      compatibility: null,
    });
  }

  const profile = registry.profilesById[reference.doc_profile];

  if (!profile) {
    return buildResolutionResult(reference, {
      profile: null,
      reason: "unknown_profile",
      compatibility: null,
    });
  }

  const compatibility = buildCompatibility(reference, profile);

  if (!compatibility.doc_spec_compatible) {
    return buildResolutionResult(reference, {
      profile,
      reason: "incompatible_doc_spec",
      compatibility,
    });
  }

  if (!compatibility.doc_kind_compatible) {
    return buildResolutionResult(reference, {
      profile,
      reason: "incompatible_doc_kind",
      compatibility,
    });
  }

  return buildResolutionResult(reference, {
    profile,
    reason: null,
    compatibility,
  });
}

function buildCompatibility(
  reference: ProfileLookupReference,
  profile: LoadedProfileDocument,
): ProfileResolutionCompatibility {
  return {
    declared_doc_spec: reference.doc_spec,
    profile_doc_spec: profile.doc_spec,
    doc_spec_compatible: reference.doc_spec === profile.doc_spec,
    declared_doc_kind: reference.doc_kind,
    profile_doc_kind: profile.doc_kind,
    doc_kind_compatible: reference.doc_kind === profile.doc_kind,
  };
}

function buildResolutionResult(
  reference: ProfileLookupReference,
  options: {
    profile: LoadedProfileDocument | null;
    reason: ProfileResolutionReason | null;
    compatibility: ProfileResolutionCompatibility | null;
  },
): ProfileResolutionResult {
  return {
    reference,
    resolved: options.reason === null && options.profile !== null,
    profile_id: options.profile?.profile_id ?? null,
    profile_path: options.profile?.source.path ?? null,
    profile: options.profile,
    reason: options.reason,
    compatibility: options.compatibility,
  };
}
