import { parseDocumentFrontmatter } from "./parse-document-frontmatter.ts";
import type {
  DiscoveredDocumentDeclaration,
  ReadDocumentDeclarationOptions,
} from "./declaration-types.ts";

export function readDocumentDeclaration(
  options: ReadDocumentDeclarationOptions,
): DiscoveredDocumentDeclaration {
  const { candidate, markdown } = options;
  const { rawFrontmatter, rawBodyMarkdown } = parseDocumentFrontmatter(
    markdown,
    candidate.path,
  );

  return {
    source: {
      path: candidate.path,
      discoveryMatches: [...candidate.discoveryMatches],
      rawFrontmatter,
      rawBodyMarkdown,
    },
    declaration: {
      docSpec: readDeclarationString(rawFrontmatter, "doc_spec"),
      docKind: readDeclarationString(rawFrontmatter, "doc_kind"),
      docProfile: readDeclarationString(rawFrontmatter, "doc_profile"),
      title: readDeclarationString(rawFrontmatter, "title"),
    },
  };
}

function readDeclarationString(
  frontmatter: Record<string, unknown>,
  key: string,
): string | null {
  const value = frontmatter[key];
  return typeof value === "string" ? value : null;
}
