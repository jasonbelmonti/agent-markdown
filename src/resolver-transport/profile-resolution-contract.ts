import type {
  ProfileLookupReference,
  ProfileResolutionCompatibility,
  ProfileResolutionReason,
} from "../core-model/profile-resolution.ts";

import type { ResolverProfileDocument } from "./profile-contract.ts";

// Resolve responses intentionally widen profile identifiers beyond the current
// MVP registry so later profiles can reuse the same transport contract.
export interface ResolverProfileResolutionResult {
  reference: ProfileLookupReference;
  resolved: boolean;
  profile_id: string | null;
  profile_path: string | null;
  profile: ResolverProfileDocument | null;
  reason: ProfileResolutionReason | null;
  compatibility: ProfileResolutionCompatibility | null;
}
