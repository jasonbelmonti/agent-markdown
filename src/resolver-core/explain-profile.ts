import { isMvpProfileId } from "../profile-registry/profile-identity.ts";
import type {
  ExplainProfileRequest,
  ExplainProfileResponse,
  ExplainProfileSummary,
} from "../resolver-transport/index.ts";

import { loadResolverContext } from "./context.ts";

export async function explainProfile(
  request: ExplainProfileRequest,
): Promise<ExplainProfileResponse> {
  const context = await loadResolverContext({ repoRoot: request.repoRoot });

  if (!isMvpProfileId(request.profileId)) {
    throw new Error(`Unknown profile "${request.profileId}".`);
  }

  const profile = context.registry.profilesById[request.profileId];

  return {
    profile,
    summary: createProfileSummary(profile),
  };
}

function createProfileSummary(
  profile: ExplainProfileResponse["profile"],
): ExplainProfileSummary {
  return {
    human: `${profile.title} defines ${profile.doc_kind} documents with ${countFields(
      profile.metadata.required,
      "required metadata field",
    )} and ${countFields(profile.body.required_sections, "required section")}.`,
    requiredMetadata: profile.metadata.required.map((field) => field.name),
    optionalMetadata: profile.metadata.optional.map((field) => field.name),
    requiredSections: [...profile.body.required_sections],
    optionalSections: [...profile.body.optional_sections],
  };
}

function countFields(values: readonly unknown[], label: string): string {
  const count = values.length;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
