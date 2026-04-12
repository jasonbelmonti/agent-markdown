import type {
  NormalizedDocumentDeclaration,
  NormalizedDocumentSource,
} from "../core-model/documents.ts";

import type { DocumentDiscoveryCandidate } from "./candidate-types.ts";

export interface ParsedDocumentFrontmatter {
  rawFrontmatter: Record<string, unknown>;
  rawBodyMarkdown: string;
}

export interface ReadDocumentDeclarationOptions {
  candidate: DocumentDiscoveryCandidate;
  markdown: string;
}

export type DiscoveredDocumentDeclarationSource = Omit<
  NormalizedDocumentSource,
  "contentHash"
>;

export interface DiscoveredDocumentDeclaration {
  source: DiscoveredDocumentDeclarationSource;
  declaration: NormalizedDocumentDeclaration;
}
