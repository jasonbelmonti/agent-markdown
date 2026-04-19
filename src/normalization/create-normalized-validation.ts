import type { ProfileResolutionResult } from "../core-model/profile-resolution.ts";
import type { NormalizedSection } from "../core-model/sections.ts";
import type { NormalizedValidation } from "../core-model/validation.ts";
import {
  validateSemanticProfileContract,
  validateStructuralProfileContract,
} from "../validation/index.ts";

export interface CreateNormalizedValidationOptions {
  profileResolution: ProfileResolutionResult;
  metadata: Record<string, unknown>;
  bodySections: NormalizedSection[];
}

export function createNormalizedValidation(
  options: CreateNormalizedValidationOptions,
): NormalizedValidation {
  const { profileResolution, metadata, bodySections } = options;

  if (!profileResolution.resolved || profileResolution.profile === null) {
    return {
      conformance: "candidate",
      errors: [],
      warnings: [],
    };
  }

  const errors = validateStructuralProfileContract({
    profile: profileResolution.profile,
    metadata,
    bodySections,
  });

  if (errors.length > 0) {
    return {
      conformance: "recognized",
      errors,
      warnings: [],
    };
  }

  const semanticValidation = validateSemanticProfileContract({
    profile: profileResolution.profile,
    bodySections,
  });

  return {
    conformance:
      semanticValidation.errors.length === 0
        ? "semantically_valid"
        : "structurally_valid",
    errors: semanticValidation.errors,
    warnings: semanticValidation.warnings,
  };
}
