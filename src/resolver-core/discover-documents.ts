import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";

import type { DocumentDiscoveryCandidate } from "../document-discovery/index.ts";
import type {
  DiscoverRequest,
  DiscoverResponse,
  DiscoverResponseDocument,
  DiscoveredDocumentResolvedSummary,
} from "../resolver-transport/index.ts";

import {
  loadResolverContext,
  type ResolverContext,
} from "./context.ts";
import {
  prepareResolverDocument,
  type PreparedResolverDocument,
} from "./prepared-document.ts";
import { hasDeclarationIdentity } from "./declaration-identity.ts";
import { resolvePreparedDocument } from "./resolve-document.ts";

const skippedDirectoryNames = new Set([".git", "node_modules"]);

export async function discoverDocuments(
  request: DiscoverRequest,
): Promise<DiscoverResponse> {
  const context = await loadResolverContext({ repoRoot: request.repoRoot });
  const markdownPaths = await listScopedMarkdownPaths(
    context.repoRoot,
    request.scopePaths,
  );
  const documents: DiscoverResponse["documents"] = [];

  for (const absolutePath of markdownPaths) {
    const preparedDocument = await prepareResolverDocument({
      input: {
        kind: "path",
        path: absolutePath,
      },
      repoRoot: context.repoRoot,
      discoveryHints: context.discoveryHints,
    });
    const declaration = hasDeclarationIdentity(
      preparedDocument.discoveredDocument.declaration,
    )
      ? preparedDocument.discoveredDocument.declaration
      : null;

    if (!shouldIncludeDocument(preparedDocument.candidate, declaration)) {
      continue;
    }

    if (
      !matchesDiscoverFilters(
        context.registry,
        preparedDocument.candidate,
        declaration,
        request,
      )
    ) {
      continue;
    }

    documents.push({
      path: preparedDocument.candidate.path,
      discoveryMatches: [...preparedDocument.candidate.discoveryMatches],
      declaration,
      resolved:
        request.mode === undefined
          ? null
          : await createResolvedSummary(
              context,
              preparedDocument,
              request.mode,
            ),
    });
  }

  return { documents };
}

async function createResolvedSummary(
  context: ResolverContext,
  preparedDocument: PreparedResolverDocument,
  mode: NonNullable<DiscoverRequest["mode"]>,
): Promise<DiscoveredDocumentResolvedSummary> {
  const response = await resolvePreparedDocument(
    context,
    preparedDocument,
    { mode },
  );

  return {
    conformance: response.normalizedDocument.validation.conformance,
    profile: {
      resolved: response.profileResolution.resolved,
      profileId: response.profileResolution.profile_id,
      profilePath: response.profileResolution.profile_path,
      reason: response.profileResolution.reason,
    },
    resolution: response.resolution,
    trust: response.trust,
    guidance: response.guidance,
  };
}

function shouldIncludeDocument(
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverResponseDocument["declaration"],
): boolean {
  return declaration !== null || candidate.discoveryMatches.length > 0;
}

function matchesDiscoverFilters(
  profilesById: ResolverContext["registry"]["profilesById"],
  candidate: DocumentDiscoveryCandidate,
  declaration: DiscoverResponseDocument["declaration"],
  request: DiscoverRequest,
): boolean {
  if (request.docKinds && request.docKinds.length > 0) {
    const matchedDocKinds = new Set<string>();

    if (declaration?.docKind !== null) {
      matchedDocKinds.add(declaration.docKind);
    }

    for (const hint of candidate.matchedHints) {
      const profile = profilesById[hint.origin.profileId];
      matchedDocKinds.add(profile.doc_kind);
    }

    if (!request.docKinds.some((docKind) => matchedDocKinds.has(docKind))) {
      return false;
    }
  }

  if (request.profileIds && request.profileIds.length > 0) {
    const matchedProfileIds = new Set<string>();

    if (declaration?.docProfile !== null) {
      matchedProfileIds.add(declaration.docProfile);
    }

    for (const hint of candidate.matchedHints) {
      matchedProfileIds.add(hint.origin.profileId);
    }

    if (!request.profileIds.some((profileId) => matchedProfileIds.has(profileId))) {
      return false;
    }
  }

  return true;
}

async function listScopedMarkdownPaths(
  repoRoot: string,
  scopePaths: readonly string[] | undefined,
): Promise<string[]> {
  const discoveredPaths = new Set<string>();
  const visitedDirectories = new Set<string>();
  const scopedPaths = scopePaths && scopePaths.length > 0 ? scopePaths : ["."];

  for (const scopePath of scopedPaths) {
    await collectMarkdownPaths(
      resolvePath(repoRoot, scopePath),
      discoveredPaths,
      visitedDirectories,
    );
  }

  return [...discoveredPaths].sort();
}

async function collectMarkdownPaths(
  absolutePath: string,
  discoveredPaths: Set<string>,
  visitedDirectories: Set<string>,
): Promise<void> {
  const entry = await lstat(absolutePath).catch(() => null);

  if (entry === null) {
    throw new Error(`Scope path does not exist: ${absolutePath}`);
  }

  if (entry.isSymbolicLink()) {
    await collectSymbolicLinkMarkdownPaths(
      absolutePath,
      discoveredPaths,
      visitedDirectories,
    );
    return;
  }

  if (entry.isDirectory()) {
    await collectDirectoryMarkdownPaths(
      absolutePath,
      discoveredPaths,
      visitedDirectories,
    );
    return;
  }

  if (entry.isFile() && absolutePath.toLowerCase().endsWith(".md")) {
    discoveredPaths.add(absolutePath);
  }
}

async function collectSymbolicLinkMarkdownPaths(
  absolutePath: string,
  discoveredPaths: Set<string>,
  visitedDirectories: Set<string>,
): Promise<void> {
  const canonicalPath = await realpath(absolutePath).catch(() => null);
  const targetEntry = await stat(absolutePath).catch(() => null);

  if (canonicalPath === null || targetEntry === null) {
    throw new Error(`Scope path does not exist: ${absolutePath}`);
  }

  if (targetEntry.isDirectory()) {
    await collectDirectoryMarkdownPaths(
      absolutePath,
      discoveredPaths,
      visitedDirectories,
      canonicalPath,
    );
    return;
  }

  if (targetEntry.isFile() && absolutePath.toLowerCase().endsWith(".md")) {
    discoveredPaths.add(absolutePath);
  }
}

async function collectDirectoryMarkdownPaths(
  absolutePath: string,
  discoveredPaths: Set<string>,
  visitedDirectories: Set<string>,
  canonicalPath?: string,
): Promise<void> {
  const directoryPath = canonicalPath ?? (await realpath(absolutePath));

  // Break cycles when the same directory is reachable through a symlink alias.
  if (visitedDirectories.has(directoryPath)) {
    return;
  }

  visitedDirectories.add(directoryPath);

  const childEntries = await readdir(absolutePath, { withFileTypes: true });

  childEntries.sort((left, right) => left.name.localeCompare(right.name));

  for (const childEntry of childEntries) {
    if (
      skippedDirectoryNames.has(childEntry.name) &&
      (childEntry.isDirectory() || childEntry.isSymbolicLink())
    ) {
      continue;
    }

    await collectMarkdownPaths(
      join(absolutePath, childEntry.name),
      discoveredPaths,
      visitedDirectories,
    );
  }
}
