import type { MvpProfileId } from "../core-model/profiles.ts";

export type DiscoveryHintKind = "path" | "filename" | "glob";

export interface DocumentDiscoveryHintOrigin {
  profileId: MvpProfileId;
  profilePath: string;
}

export interface DocumentDiscoveryHint {
  kind: DiscoveryHintKind;
  value: string;
  origin: DocumentDiscoveryHintOrigin;
}

export interface DiscoverDocumentCandidateOptions {
  path: string;
  discoveryHints: readonly DocumentDiscoveryHint[];
  repoRoot?: string;
}

export interface DiscoverDocumentCandidatesOptions {
  paths: readonly string[];
  discoveryHints: readonly DocumentDiscoveryHint[];
  repoRoot?: string;
}

export interface DocumentDiscoveryCandidate {
  path: string;
  discoveryMatches: string[];
  matchedHints: DocumentDiscoveryHint[];
}
