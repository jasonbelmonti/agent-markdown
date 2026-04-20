import { relative, resolve as resolvePath, sep } from "node:path";

import {
  discoverDocumentCandidate,
  type DocumentDiscoveryCandidate,
  type DocumentDiscoveryHint,
} from "../document-discovery/index.ts";

export interface LoadCliTargetDocumentOptions {
  path: string;
  repoRoot: string;
  discoveryHints: readonly DocumentDiscoveryHint[];
}

export interface CliTargetDocument {
  candidate: DocumentDiscoveryCandidate;
  markdown: string;
}

export async function loadCliTargetDocument(
  options: LoadCliTargetDocumentOptions,
): Promise<CliTargetDocument> {
  const absolutePath = resolvePath(options.repoRoot, options.path);
  const file = Bun.file(absolutePath);

  if (!(await file.exists())) {
    throw new Error(`Document path does not exist: ${options.path}`);
  }

  const candidate =
    discoverDocumentCandidate({
      path: absolutePath,
      repoRoot: options.repoRoot,
      discoveryHints: options.discoveryHints,
    }) ?? createMarkdownDocumentCandidate(absolutePath, options.repoRoot);

  if (candidate === null) {
    throw new Error(
      `Document did not match any registered discovery hint: ${options.path}`,
    );
  }

  return {
    candidate,
    markdown: await file.text(),
  };
}

function createMarkdownDocumentCandidate(
  absolutePath: string,
  repoRoot: string,
): DocumentDiscoveryCandidate | null {
  if (!absolutePath.toLowerCase().endsWith(".md")) {
    return null;
  }

  return {
    path: relative(repoRoot, absolutePath).split(sep).join("/"),
    discoveryMatches: [],
    matchedHints: [],
  };
}
