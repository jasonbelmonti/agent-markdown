import {
  findMatchedDiscoveryHints,
  normalizeDocumentPath,
} from "./match-discovery-hints.ts";
import type {
  DiscoverDocumentCandidateOptions,
  DiscoverDocumentCandidatesOptions,
  DocumentDiscoveryCandidate,
  DocumentDiscoveryHint,
} from "./candidate-types.ts";

export function discoverDocumentCandidate(
  options: DiscoverDocumentCandidateOptions,
): DocumentDiscoveryCandidate | null {
  const { discoveryHints, path, repoRoot } = options;
  const normalizedPath = normalizeDocumentPath(path, repoRoot);
  const matchedHints = findMatchedDiscoveryHints(discoveryHints, path, repoRoot);

  if (matchedHints.length === 0) {
    return null;
  }

  return {
    path: normalizedPath,
    discoveryMatches: collectDiscoveryMatches(matchedHints),
    matchedHints,
  };
}

export function discoverDocumentCandidates(
  options: DiscoverDocumentCandidatesOptions,
): DocumentDiscoveryCandidate[] {
  return options.paths
    .map((path) =>
      discoverDocumentCandidate({
        path,
        discoveryHints: options.discoveryHints,
        repoRoot: options.repoRoot,
      }),
    )
    .filter((candidate): candidate is DocumentDiscoveryCandidate => candidate !== null);
}

function collectDiscoveryMatches(hints: readonly DocumentDiscoveryHint[]): string[] {
  const matches = new Set<string>();

  for (const hint of hints) {
    matches.add(hint.value);
  }

  return [...matches];
}
