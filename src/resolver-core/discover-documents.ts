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
  matchesDiscoverFilters,
  shouldIncludeDiscoveredDocument,
} from "./discover-filtering.ts";
import {
  prepareResolverDocument,
  type PreparedResolverDocument,
} from "./prepared-document.ts";
import { hasDeclaredSemantics } from "./declaration-identity.ts";
import { listScopedMarkdownPaths } from "./discover-document-paths.ts";
import { resolvePreparedDocument } from "./resolve-document.ts";

type DiscoverDeclaration = DiscoverResponseDocument["declaration"];

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
    const preparedDocument = await tryPrepareDiscoverDocument(
      absolutePath,
      context,
    );

    if (preparedDocument === null) {
      continue;
    }

    if (isProfileSpecification(preparedDocument)) {
      continue;
    }

    const declaration = toDiscoverDeclaration(preparedDocument);
    const matchesFilters = matchesDiscoverFilters(
      context.registry.profilesById,
      preparedDocument.candidate,
      declaration,
      request,
    );

    if (
      !shouldIncludeDiscoveredDocument(
        context.registry.profilesById,
        preparedDocument.candidate,
        declaration,
        request,
        matchesFilters,
      )
    ) {
      continue;
    }

    if (!matchesFilters) {
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

async function tryPrepareDiscoverDocument(
  absolutePath: string,
  context: ResolverContext,
): Promise<PreparedResolverDocument | null> {
  try {
    return await prepareResolverDocument({
      input: {
        kind: "path",
        path: absolutePath,
      },
      repoRoot: context.repoRoot,
      discoveryHints: context.discoveryHints,
    });
  } catch (error) {
    if (isMalformedFrontmatterError(error)) {
      return null;
    }

    throw error;
  }
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

function toDiscoverDeclaration(
  preparedDocument: PreparedResolverDocument,
): DiscoverDeclaration {
  const declaration = preparedDocument.discoveredDocument.declaration;

  return hasDeclaredSemantics(declaration) ? declaration : null;
}

function isProfileSpecification(
  preparedDocument: PreparedResolverDocument,
): boolean {
  return preparedDocument.discoveredDocument.source.path.endsWith(".profile.md");
}

function isMalformedFrontmatterError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("has malformed YAML frontmatter") ||
    error.message.includes("frontmatter must parse to a mapping")
  );
}
