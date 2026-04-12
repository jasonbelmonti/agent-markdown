import { basename, isAbsolute, relative, sep } from "node:path";

import { compareDiscoveryHints } from "./discovery-hints.ts";
import type { DocumentDiscoveryHint } from "./types.ts";

export function findMatchedDiscoveryHints(
  hints: readonly DocumentDiscoveryHint[],
  path: string,
  repoRoot?: string,
): DocumentDiscoveryHint[] {
  const normalizedPath = normalizeDocumentPath(path, repoRoot);

  if (!isMarkdownPath(normalizedPath)) {
    return [];
  }

  return hints
    .filter((hint) => matchesHint(hint, normalizedPath, repoRoot))
    .sort(compareDiscoveryHints);
}

export function normalizeDocumentPath(path: string, repoRoot?: string): string {
  const portablePath = path.split("\\").join("/");

  if (!repoRoot || !isAbsolute(path)) {
    return portablePath;
  }

  return relative(repoRoot, path).split(sep).join("/");
}

function matchesHint(
  hint: DocumentDiscoveryHint,
  normalizedPath: string,
  repoRoot?: string,
): boolean {
  switch (hint.kind) {
    case "path":
      return normalizeDocumentPath(hint.value, repoRoot) === normalizedPath;
    case "filename":
      return basename(normalizedPath) === hint.value;
    case "glob":
      return new Bun.Glob(hint.value).match(normalizedPath);
  }
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}
