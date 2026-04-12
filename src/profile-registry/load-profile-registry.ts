import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import type { LoadedProfileDocument, MvpProfileId } from "../core-model/profiles.ts";
import { loadProfileDocument } from "./load-profile-document.ts";
import { supportedMvpProfileIds } from "./profile-identity.ts";

export interface LoadedProfileRegistry {
  repoRoot: string;
  profilesDir: string;
  profilesById: Record<MvpProfileId, LoadedProfileDocument>;
}

export interface LoadProfileRegistryOptions {
  repoRoot?: string;
}

export async function loadProfileRegistry(
  options: LoadProfileRegistryOptions = {},
): Promise<LoadedProfileRegistry> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const profilesDir = join(repoRoot, "profiles");
  const profilePaths = await listProfileDocumentPaths(profilesDir);
  const profilesById: Partial<Record<MvpProfileId, LoadedProfileDocument>> = {};

  for (const absolutePath of profilePaths) {
    const relativePath = toPortableRelativePath(repoRoot, absolutePath);
    const profile = await loadProfileDocument({
      absolutePath,
      relativePath,
    });

    if (profilesById[profile.profile_id]) {
      throw new Error(
        `Duplicate profile_id "${profile.profile_id}" encountered while loading "${relativePath}".`,
      );
    }

    profilesById[profile.profile_id] = profile;
  }

  for (const profileId of supportedMvpProfileIds) {
    if (!profilesById[profileId]) {
      throw new Error(
        `Missing required MVP profile "${profileId}" in "${profilesDir}".`,
      );
    }
  }

  return {
    repoRoot,
    profilesDir,
    profilesById: profilesById as Record<MvpProfileId, LoadedProfileDocument>,
  };
}

async function listProfileDocumentPaths(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nestedPaths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(rootDir, entry.name);

      if (entry.isDirectory()) {
        return listProfileDocumentPaths(absolutePath);
      }

      if (entry.isFile() && entry.name.endsWith(".profile.md")) {
        return [absolutePath];
      }

      return [];
    }),
  );

  return nestedPaths.flat().sort();
}

function toPortableRelativePath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join("/");
}
