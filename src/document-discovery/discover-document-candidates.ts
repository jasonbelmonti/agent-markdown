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
  const candidates: DocumentDiscoveryCandidate[] = [];

  for (const path of options.paths) {
    const candidate = discoverDocumentCandidate({
      path,
      discoveryHints: options.discoveryHints,
      repoRoot: options.repoRoot,
    });

    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function collectDiscoveryMatches(hints: readonly DocumentDiscoveryHint[]): string[] {
  const matches = new Set<string>();

  for (const hint of hints) {
    matches.add(hint.value);
  }

  return [...matches];
}
