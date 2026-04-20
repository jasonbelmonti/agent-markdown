import type { NormalizedDocumentDeclaration } from "../core-model/documents.ts";
import type { DiscoveryHintKind } from "../document-discovery/types.ts";

import type { ResolverDocumentInput } from "./input.ts";

export type SniffRecommendation = "ignore" | "resolve" | "resolve_informational";

export interface ResolverDiscoveryHintOrigin {
  profileId: string;
  profilePath: string;
}

export interface ResolverDiscoveryHint {
  kind: DiscoveryHintKind;
  value: string;
  origin: ResolverDiscoveryHintOrigin;
}

export interface SniffRequest {
  input: ResolverDocumentInput;
  repoRoot?: string;
}

export interface SniffResponse {
  frontmatterFound: boolean;
  declaration: NormalizedDocumentDeclaration;
  matchedHints: ResolverDiscoveryHint[];
  recommendation: SniffRecommendation;
}
