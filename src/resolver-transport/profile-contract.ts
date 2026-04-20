import type { ProfileAffordances } from "../core-model/affordances.ts";
import type {
  ProfileBodyContract,
  ProfileDiscovery,
  ProfileMetadataContract,
  ProfileValidationRules,
  RawProfileSource,
} from "../core-model/profiles.ts";

// Keep the transport seam widened so future registry growth does not require
// a public contract break.
export interface ResolverProfileDocument {
  source: RawProfileSource;
  profile_id: string;
  doc_spec: string;
  doc_kind: string;
  title: string;
  discovery: ProfileDiscovery;
  metadata: ProfileMetadataContract;
  body: ProfileBodyContract;
  validation: ProfileValidationRules<string, string>;
  affordances: ProfileAffordances;
}
