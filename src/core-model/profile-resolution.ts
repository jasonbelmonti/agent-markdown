import type { LoadedProfileDocument, MvpProfileId } from "./profiles.ts";

export interface ProfileLookupReference {
  doc_spec: string;
  doc_kind: string;
  doc_profile: string;
}

// Resolution is data-only so registry behavior can be added later without changing callers.
export interface ProfileResolutionResult {
  reference: ProfileLookupReference;
  resolved: boolean;
  profile_id: MvpProfileId | null;
  profile_path: string | null;
  profile: LoadedProfileDocument | null;
}
