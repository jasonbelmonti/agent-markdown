import type { ProjectedAffordances } from "../core-model/affordances.ts";
import type { ConformanceLevel } from "../core-model/conformance.ts";
import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";

export function projectNormalizedAffordances(
  profileResolution: ProfileResolutionResult,
  conformance: ConformanceLevel,
): ProjectedAffordances {
  const profile = profileResolution.profile;
  const normativeSections = profile?.affordances.normative_sections ?? [];

  if (conformance !== "semantically_valid" || profile === null) {
    return {
      role: null,
      actionability: null,
      normativeSections: [...normativeSections],
    };
  }

  return {
    role: profile.affordances.role,
    actionability: profile.affordances.actionability,
    normativeSections: [...normativeSections],
  };
}
