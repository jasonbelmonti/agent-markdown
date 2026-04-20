import { isAbsolute, relative, resolve as resolvePath, sep } from "node:path";

import {
  discoverDocumentCandidate,
  readDocumentDeclaration,
  type DiscoveredDocumentDeclaration,
  type DocumentDiscoveryCandidate,
  type DocumentDiscoveryHint,
} from "../document-discovery/index.ts";
import type { ResolverDocumentInput } from "../resolver-transport/input.ts";

export interface PrepareResolverDocumentOptions {
  input: ResolverDocumentInput;
  repoRoot: string;
  discoveryHints: readonly DocumentDiscoveryHint[];
}

export interface PreparedResolverDocument {
  candidate: DocumentDiscoveryCandidate;
  discoveredDocument: DiscoveredDocumentDeclaration;
  markdown: string;
  frontmatterFound: boolean;
}

export async function prepareResolverDocument(
  options: PrepareResolverDocumentOptions,
): Promise<PreparedResolverDocument> {
  const loadedInput = await loadResolverInput(options.input, options.repoRoot);
  const candidate = createResolverCandidate({
    path: loadedInput.path,
    repoRoot: options.repoRoot,
    discoveryHints: options.discoveryHints,
    allowNonMarkdownPath: options.input.kind === "content",
  });
  const discoveredDocument = readDocumentDeclaration({
    candidate,
    markdown: loadedInput.markdown,
  });
  const frontmatterFound =
    discoveredDocument.source.rawBodyMarkdown !== loadedInput.markdown;

  return {
    candidate,
    discoveredDocument,
    markdown: loadedInput.markdown,
    frontmatterFound,
  };
}

async function loadResolverInput(
  input: ResolverDocumentInput,
  repoRoot: string,
): Promise<{
  markdown: string;
  path: string;
}> {
  if (input.kind === "content") {
    return {
      markdown: input.content,
      path: resolveContentSourcePath(input.sourcePath, repoRoot),
    };
  }

  const absolutePath = resolvePath(repoRoot, input.path);
  const file = Bun.file(absolutePath);

  if (!(await file.exists())) {
    throw new Error(`Document path does not exist: ${input.path}`);
  }

  return {
    markdown: await file.text(),
    path: absolutePath,
  };
}

function resolveContentSourcePath(
  sourcePath: string | undefined,
  repoRoot: string,
): string {
  if (sourcePath === undefined) {
    return "<inline>";
  }

  return resolvePath(repoRoot, sourcePath);
}

function createResolverCandidate(options: {
  path: string;
  repoRoot: string;
  discoveryHints: readonly DocumentDiscoveryHint[];
  allowNonMarkdownPath: boolean;
}): DocumentDiscoveryCandidate {
  const discoveredCandidate = discoverDocumentCandidate({
    path: options.path,
    repoRoot: options.repoRoot,
    discoveryHints: options.discoveryHints,
  });

  if (discoveredCandidate !== null) {
    return discoveredCandidate;
  }

  const fallbackCandidate = createFallbackCandidate(options);

  if (fallbackCandidate === null) {
    throw new Error(
      `Document input is not Markdown and did not match any registered discovery hint: ${options.path}`,
    );
  }

  return fallbackCandidate;
}

function createFallbackCandidate(options: {
  path: string;
  repoRoot: string;
  allowNonMarkdownPath: boolean;
}): DocumentDiscoveryCandidate | null {
  const normalizedPath = normalizeCandidatePath(options.path, options.repoRoot);

  if (!options.allowNonMarkdownPath && !normalizedPath.toLowerCase().endsWith(".md")) {
    return null;
  }

  return {
    path: normalizedPath,
    discoveryMatches: [],
    matchedHints: [],
  };
}

function normalizeCandidatePath(path: string, repoRoot: string): string {
  if (path === "<inline>") {
    return path;
  }

  if (!isAbsolute(path)) {
    return path.split("\\").join("/");
  }

  return relative(repoRoot, path).split(sep).join("/");
}
