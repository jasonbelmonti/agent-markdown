import {
  collectDiscoveryHints,
  type DocumentDiscoveryHint,
} from "../document-discovery/index.ts";
import {
  loadProfileRegistry,
  type LoadedProfileRegistry,
} from "../profile-registry/index.ts";

export interface ResolverContext {
  repoRoot: string;
  registry: LoadedProfileRegistry;
  discoveryHints: readonly DocumentDiscoveryHint[];
}

export interface LoadResolverContextOptions {
  repoRoot?: string;
}

export async function loadResolverContext(
  options: LoadResolverContextOptions = {},
): Promise<ResolverContext> {
  const registry = await loadProfileRegistry({ repoRoot: options.repoRoot });

  return {
    repoRoot: registry.repoRoot,
    registry,
    discoveryHints: collectDiscoveryHints(registry),
  };
}
