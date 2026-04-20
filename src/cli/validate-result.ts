import type { NormalizedDocument } from "../core-model/documents.ts";
import type {
  ProfileResolutionReason,
  ProfileResolutionResult,
} from "../core-model/profile-resolution.ts";
import type { NormalizedValidation } from "../core-model/validation.ts";

export interface ValidateCliResult {
  source: {
    path: string;
    contentHash: string;
    discoveryMatches: string[];
  };
  declaration: NormalizedDocument["declaration"];
  profile: {
    resolved: boolean;
    profileId: string | null;
    profilePath: string | null;
    reason: ProfileResolutionReason | null;
  };
  validation: NormalizedValidation;
  valid: boolean;
}

export interface CreateValidateCliResultOptions {
  normalizedDocument: NormalizedDocument;
  profileResolution: ProfileResolutionResult;
}

export function createValidateCliResult(
  options: CreateValidateCliResultOptions,
): ValidateCliResult {
  const { normalizedDocument, profileResolution } = options;

  return {
    source: {
      path: normalizedDocument.source.path,
      contentHash: normalizedDocument.source.contentHash,
      discoveryMatches: [...normalizedDocument.source.discoveryMatches],
    },
    declaration: normalizedDocument.declaration,
    profile: {
      resolved: normalizedDocument.profile.resolved,
      profileId: normalizedDocument.profile.profileId,
      profilePath: normalizedDocument.profile.profilePath,
      reason: profileResolution.reason,
    },
    validation: normalizedDocument.validation,
    valid: normalizedDocument.validation.conformance === "semantically_valid",
  };
}
