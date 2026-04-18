import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  collectDiscoveryHints,
  discoverDocumentCandidate,
  loadProfileRegistry,
  parseMarkdownSections,
  readDocumentDeclaration,
  resolveProfileReference,
  type DocumentDiscoveryHint,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");
const checklistPattern = /(^|\n)- \[ \] /u;
const successCriteriaHeading = "Materially verifiable success criteria" as const;

let registry: LoadedProfileRegistry;
let discoveryHints: DocumentDiscoveryHint[];

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
  discoveryHints = collectDiscoveryHints(registry);
});

async function loadFixtureMarkdown(path: string): Promise<string> {
  return Bun.file(resolvePath(repoRoot, path)).text();
}

function discoverFixture(path: string) {
  const candidate = discoverDocumentCandidate({
    path: resolvePath(repoRoot, path),
    repoRoot,
    discoveryHints,
  });

  expect(candidate).not.toBeNull();

  if (candidate === null) {
    throw new Error(`Expected fixture "${path}" to match discovery hints.`);
  }

  expect(candidate.path).toBe(path);

  return candidate;
}

function assertCandidateMatchesProfile(
  candidate: ReturnType<typeof discoverFixture>,
  profileId: string,
) {
  expect(candidate.discoveryMatches.length).toBeGreaterThan(0);
  expect(
    candidate.matchedHints.some((hint) => hint.origin.profileId === profileId),
  ).toBeTrue();
}

async function loadResolvedFixture(path: string) {
  const candidate = discoverFixture(path);
  const markdown = await loadFixtureMarkdown(path);
  const document = readDocumentDeclaration({
    candidate,
    markdown,
  });
  const resolution = resolveProfileReference(registry, {
    doc_spec: document.declaration.docSpec,
    doc_kind: document.declaration.docKind,
    doc_profile: document.declaration.docProfile,
  });
  const sections = parseMarkdownSections(document.source.rawBodyMarkdown);

  return {
    candidate,
    document,
    resolution,
    sections,
  };
}

function createSectionContentMap(
  parsedBody: ReturnType<typeof parseMarkdownSections>,
) {
  return new Map(
    parsedBody.sections.map((section) => [section.heading, section.contentMarkdown]),
  );
}

function assertNonemptySections(
  sectionContentByHeading: Map<string, string>,
  headings: readonly string[],
) {
  for (const heading of headings) {
    expect(sectionContentByHeading.get(heading)?.length ?? 0).toBeGreaterThan(0);
  }
}

test("ships a discovered but undeclared task fixture", async () => {
  const fixturePath = "examples/invalid/declaration/undeclared.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections } =
    await loadResolvedFixture(fixturePath);
  const sectionContentByHeading = createSectionContentMap(sections);

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.source.rawFrontmatter).toEqual({});
  expect(document.declaration.docSpec).toBeNull();
  expect(document.declaration.docKind).toBeNull();
  expect(document.declaration.docProfile).toBeNull();
  expect(document.declaration.title).toBeNull();
  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("undeclared_profile");
  expect(resolution.profile).toBeNull();
  expect(sections.sections.map((section) => section.heading)).toEqual(
    taskProfile.body.required_sections,
  );
  assertNonemptySections(
    sectionContentByHeading,
    taskProfile.validation.require_nonempty_sections ?? [],
  );
  expect(sectionContentByHeading.get(successCriteriaHeading)).toMatch(
    checklistPattern,
  );
});

test("ships a malformed-frontmatter fixture that fails before declaration decoding", async () => {
  const fixturePath =
    "examples/invalid/declaration/malformed-frontmatter.task.md";
  const candidate = discoverFixture(fixturePath);
  const markdown = await loadFixtureMarkdown(fixturePath);

  expect(() =>
    readDocumentDeclaration({
      candidate,
      markdown,
    }),
  ).toThrow(
    `Document "${fixturePath}" has malformed YAML frontmatter: missing closing delimiter.`,
  );
});

test("ships an unknown-profile fixture with an otherwise valid task shape", async () => {
  const fixturePath = "examples/invalid/profile/unknown-profile.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections } =
    await loadResolvedFixture(fixturePath);
  const sectionContentByHeading = createSectionContentMap(sections);

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("task");
  expect(document.declaration.docProfile).toBe("task/experimental@v9");
  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("unknown_profile");
  expect(resolution.profile_id).toBeNull();
  expect(resolution.profile).toBeNull();
  expect(resolution.reference.doc_spec).toBe("agent-markdown/0.1");
  expect(resolution.reference.doc_kind).toBe("task");
  expect(resolution.reference.doc_profile).toBe("task/experimental@v9");
  expect(sections.sections.map((section) => section.heading)).toEqual(
    taskProfile.body.required_sections,
  );
  assertNonemptySections(
    sectionContentByHeading,
    taskProfile.validation.require_nonempty_sections ?? [],
  );
  expect(sectionContentByHeading.get(successCriteriaHeading)).toMatch(
    checklistPattern,
  );
});

test("ships a project fixture that is missing exactly one required section", async () => {
  const fixturePath =
    "examples/invalid/body/missing-success-measures.project.md";
  const projectProfile = registry.profilesById["project/basic@v1"];
  const { candidate, document, resolution, sections } =
    await loadResolvedFixture(fixturePath);
  const sectionHeadings = sections.sections.map((section) => section.heading);
  const sectionContentByHeading = createSectionContentMap(sections);
  const missingRequiredSections = projectProfile.body.required_sections.filter(
    (heading) => !sectionHeadings.includes(heading),
  );

  assertCandidateMatchesProfile(candidate, "project/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("project");
  expect(document.declaration.docProfile).toBe("project/basic@v1");
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("project/basic@v1");
  expect(missingRequiredSections).toEqual(["Success measures"]);
  expect(sectionHeadings).toEqual(
    projectProfile.body.required_sections.filter(
      (heading) => heading !== "Success measures",
    ),
  );
  assertNonemptySections(
    sectionContentByHeading,
    projectProfile.validation.require_nonempty_sections.filter(
      (heading) => heading !== "Success measures",
    ),
  );
  expect(sectionContentByHeading.has("Success measures")).toBe(false);
});

test("ships a task fixture that violates the checklist contract without missing sections", async () => {
  const fixturePath =
    "examples/invalid/contract/success-criteria-not-checklist.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections } =
    await loadResolvedFixture(fixturePath);
  const sectionContentByHeading = createSectionContentMap(sections);
  const successCriteriaSection = sectionContentByHeading.get(successCriteriaHeading);

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("task");
  expect(document.declaration.docProfile).toBe("task/basic@v1");
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("task/basic@v1");
  expect(sections.sections.map((section) => section.heading)).toEqual(
    taskProfile.body.required_sections,
  );
  assertNonemptySections(
    sectionContentByHeading,
    taskProfile.validation.require_nonempty_sections ?? [],
  );
  expect(
    taskProfile.validation.require_checklist_in_success_criteria,
  ).toBeTrue();
  expect(successCriteriaSection).toBeDefined();

  if (successCriteriaSection === undefined) {
    throw new Error(
      `Expected fixture "${fixturePath}" to include a success criteria section.`,
    );
  }

  expect(successCriteriaSection.length).toBeGreaterThan(0);
  expect(successCriteriaSection).not.toMatch(checklistPattern);
});
