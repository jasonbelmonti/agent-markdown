import type { OperatingMode } from "../core-model/conformance.ts";
import type { NormalizedDocument } from "../core-model/documents.ts";

import type { ResolverDocumentInput } from "./input.ts";
import type { ResolverProfileResolutionResult } from "./profile-resolution-contract.ts";
import type {
  ResolverGuidance,
  ResolverResponseResolution,
  ResolverTrust,
} from "./runtime-metadata.ts";

export interface ResolveRequest {
  input: ResolverDocumentInput;
  repoRoot?: string;
  mode: OperatingMode;
  profileIdOverride?: string;
}

export interface ResolveResponse {
  normalizedDocument: NormalizedDocument;
  profileResolution: ResolverProfileResolutionResult;
  resolution: ResolverResponseResolution;
  trust: ResolverTrust;
  guidance: ResolverGuidance;
}
