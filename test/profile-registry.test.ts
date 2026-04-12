import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  loadProfileRegistry,
  resolveProfileReference,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");
const expectedProfileIds = [
  "brief/basic@v1",
  "project/basic@v1",
  "task/basic@v1",
] as const;

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
});

test("loads the three MVP profiles from disk", () => {
  expect(Object.keys(registry.profilesById).sort()).toEqual([
    ...expectedProfileIds,
  ]);

  for (const profileId of expectedProfileIds) {
    const profile = registry.profilesById[profileId];

    expect(profile.profile_id).toBe(profileId);
    expect(profile.doc_spec).toBe("agent-markdown/0.1");
    expect(profile.source.path.startsWith("profiles/")).toBe(true);
    expect(Object.keys(profile.source.rawFrontmatter).length).toBeGreaterThan(0);
    expect(profile.source.rawBodyMarkdown.length).toBeGreaterThan(0);
  }
});

test("resolves a valid declared profile reference", () => {
  const resolution = resolveProfileReference(registry, {
    doc_spec: "agent-markdown/0.1",
    doc_kind: "task",
    doc_profile: "task/basic@v1",
  });

  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("task/basic@v1");
  expect(resolution.profile?.source.path).toBe("profiles/task/basic.profile.md");
  expect(resolution.compatibility).toEqual({
    declared_doc_spec: "agent-markdown/0.1",
    profile_doc_spec: "agent-markdown/0.1",
    doc_spec_compatible: true,
    declared_doc_kind: "task",
    profile_doc_kind: "task",
    doc_kind_compatible: true,
  });
});

test("returns deterministic unresolved behavior for an unknown profile", () => {
  const resolution = resolveProfileReference(registry, {
    doc_spec: "agent-markdown/0.1",
    doc_kind: "task",
    doc_profile: "task/unknown@v1",
  });

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("unknown_profile");
  expect(resolution.profile).toBeNull();
  expect(resolution.compatibility).toBeNull();
});

test("returns deterministic unresolved behavior for an incompatible doc_spec", () => {
  const resolution = resolveProfileReference(registry, {
    doc_spec: "agent-markdown/9.9",
    doc_kind: "task",
    doc_profile: "task/basic@v1",
  });

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("incompatible_doc_spec");
  expect(resolution.profile_id).toBe("task/basic@v1");
  expect(resolution.compatibility).toEqual({
    declared_doc_spec: "agent-markdown/9.9",
    profile_doc_spec: "agent-markdown/0.1",
    doc_spec_compatible: false,
    declared_doc_kind: "task",
    profile_doc_kind: "task",
    doc_kind_compatible: true,
  });
});

test("returns deterministic unresolved behavior for an incompatible doc_kind", () => {
  const resolution = resolveProfileReference(registry, {
    doc_spec: "agent-markdown/0.1",
    doc_kind: "project",
    doc_profile: "task/basic@v1",
  });

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("incompatible_doc_kind");
  expect(resolution.profile_id).toBe("task/basic@v1");
  expect(resolution.compatibility).toEqual({
    declared_doc_spec: "agent-markdown/0.1",
    profile_doc_spec: "agent-markdown/0.1",
    doc_spec_compatible: true,
    declared_doc_kind: "project",
    profile_doc_kind: "task",
    doc_kind_compatible: false,
  });
});

test("prioritizes doc_spec incompatibility when both doc_spec and doc_kind are incompatible", () => {
  const resolution = resolveProfileReference(registry, {
    doc_spec: "agent-markdown/9.9",
    doc_kind: "project",
    doc_profile: "task/basic@v1",
  });

  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("incompatible_doc_spec");
  expect(resolution.profile_id).toBe("task/basic@v1");
  expect(resolution.compatibility).toEqual({
    declared_doc_spec: "agent-markdown/9.9",
    profile_doc_spec: "agent-markdown/0.1",
    doc_spec_compatible: false,
    declared_doc_kind: "project",
    profile_doc_kind: "task",
    doc_kind_compatible: false,
  });
});
