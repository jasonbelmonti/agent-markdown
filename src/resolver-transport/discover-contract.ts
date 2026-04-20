import type { ConformanceLevel, OperatingMode } from "../core-model/conformance.ts";
import type { NormalizedDocumentDeclaration } from "../core-model/documents.ts";
import type { ProfileResolutionReason } from "../core-model/profile-resolution.ts";

import type {
  ResolverGuidance,
  ResolverResponseResolution,
  ResolverTrust,
} from "./runtime-metadata.ts";

export interface DiscoverRequest {
  repoRoot: string;
  scopePaths?: string[];
  docKinds?: string[];
  profileIds?: string[];
  mode?: OperatingMode;
}

export interface DiscoveredDocumentProfileSummary {
  resolved: boolean;
  profileId: string | null;
  profilePath: string | null;
  reason: ProfileResolutionReason | null;
}

export interface DiscoveredDocumentResolvedSummary {
  conformance: ConformanceLevel;
  profile: DiscoveredDocumentProfileSummary;
  resolution: ResolverResponseResolution;
  trust: ResolverTrust;
  guidance: ResolverGuidance;
}

export interface DiscoverResponseDocument {
  path: string;
  discoveryMatches: string[];
  declaration: NormalizedDocumentDeclaration | null;
  resolved: DiscoveredDocumentResolvedSummary | null;
}

export interface DiscoverResponse {
  documents: DiscoverResponseDocument[];
}
