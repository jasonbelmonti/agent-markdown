import type { LoadedProfileDocument } from "../core-model/profiles.ts";
import { decodeLoadedProfileDocument } from "./decode-loaded-profile-document.ts";
import { parseProfileFrontmatter } from "./parse-profile-frontmatter.ts";

export interface LoadProfileDocumentOptions {
  absolutePath: string;
  relativePath: string;
}

export async function loadProfileDocument(
  options: LoadProfileDocumentOptions,
): Promise<LoadedProfileDocument> {
  const markdown = await Bun.file(options.absolutePath).text();
  const { rawFrontmatter, rawBodyMarkdown } = parseProfileFrontmatter(
    markdown,
    options.relativePath,
  );

  return decodeLoadedProfileDocument({
    path: options.relativePath,
    rawFrontmatter,
    rawBodyMarkdown,
  });
}
