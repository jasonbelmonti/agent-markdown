import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";
import type { NormalizedValidation } from "../core-model/validation.ts";

export function createNormalizedValidation(
  profileResolution: ProfileResolutionResult,
): NormalizedValidation {
  return {
    conformance: profileResolution.resolved ? "recognized" : "candidate",
    errors: [],
    warnings: [],
  };
}
