import type { LoadedProfileRegistry } from "../profile-registry/load-profile-registry.ts";
import type { DiscoveryHintKind, DocumentDiscoveryHint } from "./types.ts";

const discoveryHintKindOrder: Record<DiscoveryHintKind, number> = {
  path: 0,
  filename: 1,
  glob: 2,
};

export function collectDiscoveryHints(
  registry: LoadedProfileRegistry,
): DocumentDiscoveryHint[] {
  const hints = Object.values(registry.profilesById).flatMap((profile) => {
    const origin = {
      profileId: profile.profile_id,
      profilePath: profile.source.path,
    };

    return [
      ...profile.discovery.filenames.map((value) =>
        createDiscoveryHint("filename", value, origin),
      ),
      ...profile.discovery.globs.map((value) =>
        createDiscoveryHint("glob", value, origin),
      ),
    ];
  });

  return hints.sort(compareDiscoveryHints);
}

export function compareDiscoveryHints(
  left: DocumentDiscoveryHint,
  right: DocumentDiscoveryHint,
): number {
  return (
    discoveryHintKindOrder[left.kind] - discoveryHintKindOrder[right.kind] ||
    left.value.localeCompare(right.value) ||
    left.origin.profileId.localeCompare(right.origin.profileId) ||
    left.origin.profilePath.localeCompare(right.origin.profilePath)
  );
}

function createDiscoveryHint(
  kind: DiscoveryHintKind,
  value: string,
  origin: DocumentDiscoveryHint["origin"],
): DocumentDiscoveryHint {
  return {
    kind,
    value,
    origin,
  };
}
