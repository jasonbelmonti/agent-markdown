import type { ProjectedAffordances } from "./affordances.ts";
import type { NormalizedSection } from "./sections.ts";
import type { NormalizedValidation } from "./validation.ts";

export interface NormalizedDocumentSource {
  path: string;
  contentHash: string;
  discoveryMatches: string[];
  rawFrontmatter: Record<string, unknown>;
  rawBodyMarkdown: string;
}

export interface NormalizedDocumentDeclaration {
  docSpec: string | null;
  docKind: string | null;
  docProfile: string | null;
  title: string | null;
}

export interface NormalizedDocumentProfile {
  resolved: boolean;
  profileId: string | null;
  profilePath: string | null;
}

export interface NormalizedDocumentBody {
  sections: NormalizedSection[];
}

export interface NormalizedDocument {
  source: NormalizedDocumentSource;
  declaration: NormalizedDocumentDeclaration;
  profile: NormalizedDocumentProfile;
  metadata: Record<string, unknown>;
  body: NormalizedDocumentBody;
  validation: NormalizedValidation;
  affordances: ProjectedAffordances;
  extensions: Record<string, unknown>;
}
