import type { ResolverProfileDocument } from "./profile-contract.ts";

export interface ExplainProfileRequest {
  profileId: string;
  repoRoot?: string;
}

export interface ExplainProfileSummary {
  human: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
  requiredSections: string[];
  optionalSections: string[];
}

export interface ExplainProfileResponse {
  profile: ResolverProfileDocument;
  summary: ExplainProfileSummary;
}
