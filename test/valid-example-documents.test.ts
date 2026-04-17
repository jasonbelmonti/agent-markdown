import { beforeAll, expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

import {
  collectDiscoveryHints,
  discoverDocumentCandidate,
  loadProfileRegistry,
  parseMarkdownSections,
  readDocumentDeclaration,
  resolveProfileReference,
  type LoadedProfileRegistry,
} from "../index.ts";

const repoRoot = resolvePath(import.meta.dir, "..");
const agentMarkdownSpec = "agent-markdown/0.1" as const;
const successCriteriaHeading = "Materially verifiable success criteria" as const;

const validFixtures = [
  {
    path: "examples/valid/task/basic.task.md",
    docKind: "task",
    docProfile: "task/basic@v1",
    title: "Publish the MVP task example",
    requiredSections: [
      "Objective",
      "Context / Constraints",
      "Materially verifiable success criteria",
      "Execution notes",
    ],
    requireChecklist: true,
  },
  {
    path: "examples/valid/project/basic.project.md",
    docKind: "project",
    docProfile: "project/basic@v1",
    title: "Coordinate the MVP fixture corpus",
    requiredSections: [
      "Objective",
      "Context / Constraints",
      "Scope / Non-goals",
      "Success measures",
      "Execution notes",
    ],
    requireChecklist: false,
  },
  {
    path: "examples/valid/brief/basic.brief.md",
    docKind: "brief",
    docProfile: "brief/basic@v1",
    title: "Recommend a stable example layout",
    requiredSections: [
      "Objective",
      "Context / Constraints",
      "Recommendation",
      "Open questions",
    ],
    requireChecklist: false,
  },
] as const;
type ValidFixture = (typeof validFixtures)[number];
type LoadedValidFixture = Awaited<ReturnType<typeof loadValidFixture>>;

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadProfileRegistry({ repoRoot });
});

async function loadValidFixture(
  fixture: ValidFixture,
  discoveryHints: ReturnType<typeof collectDiscoveryHints>,
) {
  const absolutePath = resolvePath(repoRoot, fixture.path);
  const candidate = discoverDocumentCandidate({
    path: absolutePath,
    repoRoot,
    discoveryHints,
  });

  expect(candidate).not.toBeNull();

  if (candidate === null) {
    throw new Error(`Expected fixture "${fixture.path}" to match discovery hints.`);
  }

  const markdown = await Bun.file(absolutePath).text();
  const document = readDocumentDeclaration({
    candidate,
    markdown,
  });

  return {
    candidate,
    document,
    resolution: resolveProfileReference(registry, {
      doc_spec: document.declaration.docSpec,
      doc_kind: document.declaration.docKind,
      doc_profile: document.declaration.docProfile,
    }),
    sections: parseMarkdownSections(document.source.rawBodyMarkdown),
  };
}

function assertValidFixture(
  fixture: ValidFixture,
  { candidate, document, resolution, sections }: LoadedValidFixture,
) {
  expect(document.source.path).toBe(fixture.path);
  expect(document.declaration).toEqual({
    docSpec: agentMarkdownSpec,
    docKind: fixture.docKind,
    docProfile: fixture.docProfile,
    title: fixture.title,
  });
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe(fixture.docProfile);
  expect(candidate.discoveryMatches).toEqual([`**/*.${fixture.docKind}.md`]);
  expect(sections.sections.map((section) => section.heading)).toEqual(
    fixture.requiredSections,
  );
  expect(
    sections.sections.every((section) => section.contentMarkdown.length > 0),
  ).toBe(true);

  if (!fixture.requireChecklist) {
    return;
  }

  const successCriteriaSection = sections.sections.find(
    (section) => section.heading === successCriteriaHeading,
  );

  expect(successCriteriaSection).toBeDefined();

  if (successCriteriaSection === undefined) {
    throw new Error(
      `Expected fixture "${fixture.path}" to include a success criteria section.`,
    );
  }

  expect(successCriteriaSection.contentMarkdown).toMatch(/(^|\n)- \[ \] /);
}

test("ships valid example documents for all three MVP profiles", async () => {
  const discoveryHints = collectDiscoveryHints(registry);

  for (const fixture of validFixtures) {
    const loadedFixture = await loadValidFixture(fixture, discoveryHints);

    assertValidFixture(fixture, loadedFixture);
  }
});
