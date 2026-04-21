import { beforeAll, expect, test } from "bun:test";

import {
  readDocumentDeclaration,
  type LoadedProfileRegistry,
  type NormalizedValidation,
} from "../index.ts";
import {
  checklistPattern,
  collectExampleDiscoveryHints,
  createSectionContentMap,
  discoverExampleFixture,
  loadExampleFixtureMarkdown,
  loadExampleFixtureRegistry,
  loadResolvedExampleFixture,
  successCriteriaHeading,
} from "./support/example-document-fixtures.ts";

let registry: LoadedProfileRegistry;
let discoveryHints: ReturnType<typeof collectExampleDiscoveryHints>;

beforeAll(async () => {
  registry = await loadExampleFixtureRegistry();
  discoveryHints = collectExampleDiscoveryHints(registry);
});

function assertCandidateMatchesProfile(
  candidate: ReturnType<typeof discoverExampleFixture>,
  profileId: string,
) {
  expect(candidate.discoveryMatches.length).toBeGreaterThan(0);
  expect(
    candidate.matchedHints.some((hint) => hint.origin.profileId === profileId),
  ).toBeTrue();
}

function assertNonemptySections(
  sectionContentByHeading: Map<string, string>,
  headings: readonly string[],
) {
  for (const heading of headings) {
    expect(sectionContentByHeading.get(heading)?.length ?? 0).toBeGreaterThan(0);
  }
}

function assertValidation(
  validation: NormalizedValidation,
  expected: NormalizedValidation,
) {
  expect(validation).toEqual(expected);
}

function createValidationError(
  code: string,
  message: string,
  path: string,
) {
  return {
    code,
    severity: "error" as const,
    message,
    path,
  };
}

test("ships a discovered but undeclared task fixture", async () => {
  const fixturePath = "examples/invalid/declaration/undeclared.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
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
  assertValidation(normalized.validation, {
    conformance: "candidate",
    errors: [],
    warnings: [],
  });
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
  const candidate = discoverExampleFixture(fixturePath, discoveryHints);
  const markdown = await loadExampleFixtureMarkdown(fixturePath);

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
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
  const sectionContentByHeading = createSectionContentMap(sections);

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("task");
  expect(document.declaration.docProfile).toBe("task/experimental@v9");
  expect(resolution.resolved).toBe(false);
  expect(resolution.reason).toBe("unknown_profile");
  expect(resolution.profile_id).toBeNull();
  expect(resolution.profile).toBeNull();
  assertValidation(normalized.validation, {
    conformance: "candidate",
    errors: [],
    warnings: [],
  });
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
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
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
  assertValidation(normalized.validation, {
    conformance: "recognized",
    errors: [
      createValidationError(
        "required-section-missing",
        'Required section "Success measures" is missing for profile "project/basic@v1".',
        'body.sections["Success measures"]',
      ),
    ],
    warnings: [],
  });
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

test("ships a brief fixture that is missing exactly one required section", async () => {
  const fixturePath =
    "examples/invalid/body/missing-open-questions.brief.md";
  const briefProfile = registry.profilesById["brief/basic@v1"];
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
  const sectionHeadings = sections.sections.map((section) => section.heading);
  const sectionContentByHeading = createSectionContentMap(sections);
  const missingRequiredSections = briefProfile.body.required_sections.filter(
    (heading) => !sectionHeadings.includes(heading),
  );

  assertCandidateMatchesProfile(candidate, "brief/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("brief");
  expect(document.declaration.docProfile).toBe("brief/basic@v1");
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("brief/basic@v1");
  assertValidation(normalized.validation, {
    conformance: "recognized",
    errors: [
      createValidationError(
        "required-section-missing",
        'Required section "Open questions" is missing for profile "brief/basic@v1".',
        'body.sections["Open questions"]',
      ),
    ],
    warnings: [],
  });
  expect(missingRequiredSections).toEqual(["Open questions"]);
  expect(sectionHeadings).toEqual(
    briefProfile.body.required_sections.filter(
      (heading) => heading !== "Open questions",
    ),
  );
  assertNonemptySections(
    sectionContentByHeading,
    briefProfile.validation.require_nonempty_sections.filter(
      (heading) => heading !== "Open questions",
    ),
  );
  expect(sectionContentByHeading.has("Open questions")).toBe(false);
});

test("ships a task fixture that violates the checklist contract without missing sections", async () => {
  const fixturePath =
    "examples/invalid/contract/success-criteria-not-checklist.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
  const sectionContentByHeading = createSectionContentMap(sections);
  const successCriteriaSection = sectionContentByHeading.get(successCriteriaHeading);

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("task");
  expect(document.declaration.docProfile).toBe("task/basic@v1");
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("task/basic@v1");
  assertValidation(normalized.validation, {
    conformance: "recognized",
    errors: [
      createValidationError(
        "checklist-required",
        'Section "Materially verifiable success criteria" must contain checklist items for profile "task/basic@v1".',
        'body.sections["Materially verifiable success criteria"]',
      ),
    ],
    warnings: [],
  });
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

test("ships a task fixture that remains structurally valid while semantic validation degrades affordances", async () => {
  const fixturePath = "examples/invalid/semantic/duplicate-objective.task.md";
  const taskProfile = registry.profilesById["task/basic@v1"];
  const { candidate, document, resolution, sections, normalized } =
    await loadResolvedExampleFixture(fixturePath, {
      discoveryHints,
      registry,
    });
  const sectionContentByHeading = createSectionContentMap(sections);
  const topLevelObjectiveSections = sections.sections.filter(
    (section) =>
      section.heading === "Objective" && section.headingPath.length === 1,
  );

  assertCandidateMatchesProfile(candidate, "task/basic@v1");
  expect(document.declaration.docSpec).toBe("agent-markdown/0.1");
  expect(document.declaration.docKind).toBe("task");
  expect(document.declaration.docProfile).toBe("task/basic@v1");
  expect(resolution.resolved).toBe(true);
  expect(resolution.reason).toBeNull();
  expect(resolution.profile_id).toBe("task/basic@v1");
  assertValidation(normalized.validation, {
    conformance: "structurally_valid",
    errors: [
      createValidationError(
        "normative-section-ambiguous",
        'Normative section "Objective" must appear at most once at the top level for profile "task/basic@v1".',
        'body.sections["Objective"]',
      ),
    ],
    warnings: [
      {
        code: "degraded-affordance",
        severity: "warning",
        message:
          'Affordances remain degraded until semantic validation passes for profile "task/basic@v1".',
        path: "affordances.actionability",
      },
    ],
  });
  expect(normalized.affordances).toEqual({
    role: null,
    actionability: null,
    normativeSections: [...taskProfile.affordances.normative_sections],
  });
  expect(sections.sections.map((section) => section.heading)).toEqual([
    "Objective",
    "Objective",
    "Context / Constraints",
    "Materially verifiable success criteria",
    "Execution notes",
  ]);
  expect(topLevelObjectiveSections).toHaveLength(2);
  expect(
    topLevelObjectiveSections.map((section) => section.contentMarkdown),
  ).toEqual([
    "Keep the first objective around to make the ambiguity obvious.",
    "The second objective should make the document structurally parseable but\nsemantically ambiguous.",
  ]);
  assertNonemptySections(
    sectionContentByHeading,
    taskProfile.validation.require_nonempty_sections.filter(
      (heading) => heading !== "Objective",
    ),
  );
  expect(sectionContentByHeading.get(successCriteriaHeading)).toMatch(
    checklistPattern,
  );
});
