import { beforeAll, expect, test } from "bun:test";

import { type LoadedProfileRegistry } from "../index.ts";
import {
  checklistPattern,
  collectExampleDiscoveryHints,
  createSectionContentMap,
  loadExampleFixtureRegistry,
  loadResolvedExampleFixture,
  successCriteriaHeading,
} from "./support/example-document-fixtures.ts";

const agentMarkdownSpec = "agent-markdown/0.1" as const;

const validFixtures = [
  {
    path: "examples/valid/task/basic.task.md",
    docKind: "task",
    docProfile: "task/basic@v1",
    title: "Publish the MVP task example",
  },
  {
    path: "examples/valid/project/basic.project.md",
    docKind: "project",
    docProfile: "project/basic@v1",
    title: "Coordinate the MVP fixture corpus",
  },
  {
    path: "examples/valid/brief/basic.brief.md",
    docKind: "brief",
    docProfile: "brief/basic@v1",
    title: "Recommend a stable example layout",
  },
] as const;
type ValidFixture = (typeof validFixtures)[number];
type LoadedValidFixture = Awaited<ReturnType<typeof loadResolvedExampleFixture>>;

let registry: LoadedProfileRegistry;

beforeAll(async () => {
  registry = await loadExampleFixtureRegistry();
});

function assertValidFixture(
  fixture: ValidFixture,
  { candidate, document, resolution, sections, normalized }: LoadedValidFixture,
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
  expect(resolution.profile).not.toBeNull();

  if (resolution.profile === null) {
    throw new Error(
      `Expected fixture "${fixture.path}" to resolve profile "${fixture.docProfile}".`,
    );
  }

  const {
    body: {
      required_sections: requiredSections,
      optional_sections: optionalSections,
    },
    discovery: { globs: discoveryGlobs },
    validation: {
      require_nonempty_sections: requiredNonemptySections = [],
      require_checklist_in_success_criteria: requireChecklist = false,
    },
  } = resolution.profile;
  const topLevelSectionHeadings = sections.sections
    .filter((section) => section.headingPath.length === 1)
    .map((section) => section.heading);
  const allowedTopLevelHeadings = new Set([
    ...requiredSections,
    ...optionalSections,
  ]);

  expect(candidate.discoveryMatches).toEqual(discoveryGlobs);
  expect(
    topLevelSectionHeadings.filter((heading) => requiredSections.includes(heading)),
  ).toEqual(requiredSections);
  expect(
    topLevelSectionHeadings.every((heading) => allowedTopLevelHeadings.has(heading)),
  ).toBeTrue();

  expect(normalized.validation).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
  expect(normalized.affordances).toEqual({
    role: resolution.profile.affordances.role,
    actionability: resolution.profile.affordances.actionability,
    normativeSections: [...resolution.profile.affordances.normative_sections],
  });
  const sectionContentByHeading = createSectionContentMap(sections);

  for (const heading of requiredNonemptySections) {
    expect(sectionContentByHeading.get(heading)?.length ?? 0).toBeGreaterThan(0);
  }

  if (!requireChecklist) {
    return;
  }

  const successCriteriaSection = sectionContentByHeading.get(successCriteriaHeading);
  expect(successCriteriaSection).toBeDefined();

  if (successCriteriaSection === undefined) {
    throw new Error(
      `Expected fixture "${fixture.path}" to include a success criteria section.`,
    );
  }

  expect(successCriteriaSection).toMatch(checklistPattern);
}

test("ships valid example documents for all three MVP profiles", async () => {
  const discoveryHints = collectExampleDiscoveryHints(registry);

  for (const fixture of validFixtures) {
    const loadedFixture = await loadResolvedExampleFixture(fixture.path, {
      discoveryHints,
      registry,
    });

    assertValidFixture(fixture, loadedFixture);
  }
});
