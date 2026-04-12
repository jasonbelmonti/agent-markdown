import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  collectDiscoveryHints,
  discoverDocumentCandidate,
  discoverDocumentCandidates,
  loadProfileRegistry,
  type DocumentDiscoveryHint,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
});

test("collects deterministic discovery hints from the loaded profile registry", () => {
  expect(collectDiscoveryHints(registry)).toEqual([
    {
      kind: "filename",
      value: "BRIEF.md",
      origin: {
        profileId: "brief/basic@v1",
        profilePath: "profiles/brief/basic.profile.md",
      },
    },
    {
      kind: "filename",
      value: "PROJECT.md",
      origin: {
        profileId: "project/basic@v1",
        profilePath: "profiles/project/basic.profile.md",
      },
    },
    {
      kind: "filename",
      value: "TASK.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
    {
      kind: "glob",
      value: "**/*.brief.md",
      origin: {
        profileId: "brief/basic@v1",
        profilePath: "profiles/brief/basic.profile.md",
      },
    },
    {
      kind: "glob",
      value: "**/*.project.md",
      origin: {
        profileId: "project/basic@v1",
        profilePath: "profiles/project/basic.profile.md",
      },
    },
    {
      kind: "glob",
      value: "**/*.task.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
  ]);
});

test("classifies a markdown file as a candidate when registry-derived hints match", () => {
  const candidate = discoverDocumentCandidate({
    path: "plans/TASK.md",
    discoveryHints: collectDiscoveryHints(registry),
  });

  expect(candidate).toEqual({
    path: "plans/TASK.md",
    discoveryMatches: ["TASK.md"],
    matchedHints: [
      {
        kind: "filename",
        value: "TASK.md",
        origin: {
          profileId: "task/basic@v1",
          profilePath: "profiles/task/basic.profile.md",
        },
      },
    ],
  });

  expect(candidate).not.toBeNull();
  expect("docKind" in (candidate ?? {})).toBe(false);
  expect("docProfile" in (candidate ?? {})).toBe(false);
});

test("records every matching hint kind without inferring canonical semantics", () => {
  const discoveryHints = [
    {
      kind: "path",
      value: "docs/TASK.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
    {
      kind: "filename",
      value: "TASK.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
    {
      kind: "glob",
      value: "docs/*.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
  ] satisfies DocumentDiscoveryHint[];
  const absolutePath = resolvePath(repoRoot, "docs", "TASK.md");

  const candidate = discoverDocumentCandidate({
    path: absolutePath,
    repoRoot,
    discoveryHints,
  });

  expect(candidate).toEqual({
    path: "docs/TASK.md",
    discoveryMatches: ["docs/TASK.md", "TASK.md", "docs/*.md"],
    matchedHints: discoveryHints,
  });
});

test("filters out non-candidates and non-markdown files", () => {
  const candidates = discoverDocumentCandidates({
    repoRoot,
    discoveryHints: collectDiscoveryHints(registry),
    paths: [
      resolvePath(repoRoot, "plans", "launch.project.md"),
      resolvePath(repoRoot, "plans", "notes.md"),
      resolvePath(repoRoot, "plans", "TASK.txt"),
      "plans\\overview.brief.md",
    ],
  });

  expect(candidates).toEqual([
    {
      path: "plans/launch.project.md",
      discoveryMatches: ["**/*.project.md"],
      matchedHints: [
        {
          kind: "glob",
          value: "**/*.project.md",
          origin: {
            profileId: "project/basic@v1",
            profilePath: "profiles/project/basic.profile.md",
          },
        },
      ],
    },
    {
      path: "plans/overview.brief.md",
      discoveryMatches: ["**/*.brief.md"],
      matchedHints: [
        {
          kind: "glob",
          value: "**/*.brief.md",
          origin: {
            profileId: "brief/basic@v1",
            profilePath: "profiles/brief/basic.profile.md",
          },
        },
      ],
    },
  ]);
});
