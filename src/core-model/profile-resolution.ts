import type { LoadedProfileDocument, MvpProfileId } from "./profiles.ts";

export interface ProfileLookupReference {
  doc_spec: string | null;
  doc_kind: string | null;
  doc_profile: string | null;
}

export type ProfileResolutionReason =
  | "undeclared_profile"
  | "unknown_profile"
  | "incompatible_doc_spec"
  | "incompatible_doc_kind";

export interface ProfileResolutionCompatibility {
  declared_doc_spec: string | null;
  profile_doc_spec: string | null;
  doc_spec_compatible: boolean;
  declared_doc_kind: string | null;
  profile_doc_kind: string | null;
  doc_kind_compatible: boolean;
}

// Resolution is data-only so registry behavior can be added later without changing callers.
export interface ProfileResolutionResult {
  reference: ProfileLookupReference;
  resolved: boolean;
  profile_id: MvpProfileId | null;
  profile_path: string | null;
  profile: LoadedProfileDocument | null;
  reason: ProfileResolutionReason | null;
  compatibility: ProfileResolutionCompatibility | null;
}
