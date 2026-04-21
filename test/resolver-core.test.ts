import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";

import {
  type DocumentDiscoveryHint,
  discoverDocuments,
  explainProfile,
  resolveDocument,
  sniffDocument,
} from "../index.ts";
import { prepareResolverDocument } from "../src/resolver-core/prepared-document.ts";

const repoRoot = resolvePath(import.meta.dir, "..");
const textDecoder = new TextDecoder();

test("sniffDocument detects declared task documents and recommends full resolution", async () => {
  const response = await sniffDocument({
    input: {
      kind: "path",
      path: "examples/valid/task/basic.task.md",
    },
    repoRoot,
  });

  expect(response).toEqual({
    frontmatterFound: true,
    declaration: {
      docSpec: "agent-markdown/0.1",
      docKind: "task",
      docProfile: "task/basic@v1",
      title: "Publish the MVP task example",
    },
    matchedHints: [
      {
        kind: "glob",
        value: "**/*.task.md",
        origin: {
          profileId: "task/basic@v1",
          profilePath: "profiles/task/basic.profile.md",
        },
      },
    ],
    recommendation: "resolve",
  });
});

test("sniffDocument keeps discovery hints available for raw content without declared semantics", async () => {
  const content = await Bun.file(
    resolvePath(repoRoot, "examples/invalid/declaration/undeclared.task.md"),
  ).text();
  const response = await sniffDocument({
    input: {
      kind: "content",
      content,
      sourcePath: "notes/TASK.md",
    },
    repoRoot,
  });

  expect(response).toEqual({
    frontmatterFound: false,
    declaration: {
      docSpec: null,
      docKind: null,
      docProfile: null,
      title: null,
    },
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
    recommendation: "resolve_informational",
  });
});

test("resolveDocument reuses the existing normalization and validation path for declared inputs", async () => {
  const response = await resolveDocument({
    input: {
      kind: "path",
      path: "examples/valid/task/basic.task.md",
    },
    repoRoot,
    mode: "assistive",
  });

  expect(response.normalizedDocument.validation).toEqual({
    conformance: "semantically_valid",
    errors: [],
    warnings: [],
  });
  expect(response.profileResolution.resolved).toBe(true);
  expect(response.resolution).toEqual({
    mode: "assistive",
    source: "declaration",
    requestedProfileId: null,
    effectiveProfileId: "task/basic@v1",
  });
  expect(response.trust).toEqual({
    mayReference: true,
    mayPlanFrom: true,
    mayExecuteFrom: true,
    requiresUserConfirmation: true,
  });
  expect(response.guidance).toEqual({
    codes: ["request_user_confirmation"],
  });
});

test("resolveDocument accepts raw markdown content and preserves the provided source path", async () => {
  const content = await Bun.file(
    resolvePath(repoRoot, "examples/valid/task/basic.task.md"),
  ).text();
  const response = await resolveDocument({
    input: {
      kind: "content",
      content,
      sourcePath: "drafts/current-task.md",
    },
    repoRoot,
    mode: "assistive",
  });

  expect(response.normalizedDocument.source.path).toBe("drafts/current-task.md");
  expect(response.normalizedDocument.validation.conformance).toBe(
    "semantically_valid",
  );
  expect(response.resolution.source).toBe("declaration");
});

test("prepareResolverDocument canonicalizes raw-content sourcePath values before path-hint discovery", async () => {
  const discoveryHints = [
    {
      kind: "path",
      value: "notes/TASK.md",
      origin: {
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
    },
  ] satisfies DocumentDiscoveryHint[];

  const preparedDocument = await prepareResolverDocument({
    input: {
      kind: "content",
      content: "## Objective\n",
      sourcePath: "./notes/TASK.md",
    },
    repoRoot,
    discoveryHints,
  });

  expect(preparedDocument.candidate).toEqual({
    path: "notes/TASK.md",
    discoveryMatches: ["notes/TASK.md"],
    matchedHints: discoveryHints,
  });
});

test("resolveDocument keeps discovery fallback documents below semantic trust", async () => {
  const response = await resolveDocument({
    input: {
      kind: "path",
      path: "examples/invalid/declaration/undeclared.task.md",
    },
    repoRoot,
    mode: "informational",
  });

  expect(response.normalizedDocument.validation.conformance).toBe("candidate");
  expect(response.profileResolution).toMatchObject({
    resolved: false,
    profile_id: null,
    reason: "undeclared_profile",
  });
  expect(response.resolution).toEqual({
    mode: "informational",
    source: "discovery_fallback",
    requestedProfileId: null,
    effectiveProfileId: "task/basic@v1",
  });
  expect(response.trust).toEqual({
    mayReference: true,
    mayPlanFrom: false,
    mayExecuteFrom: false,
    requiresUserConfirmation: false,
  });
  expect(response.guidance).toEqual({
    codes: ["treat_as_plain_markdown"],
  });
});

test("resolveDocument keeps unknown declared profiles below semantic trust", async () => {
  const response = await resolveDocument({
    input: {
      kind: "path",
      path: "examples/invalid/profile/unknown-profile.task.md",
    },
    repoRoot,
    mode: "informational",
  });

  expect(response.normalizedDocument.validation.conformance).toBe("candidate");
  expect(response.profileResolution).toMatchObject({
    resolved: false,
    profile_id: null,
    reason: "unknown_profile",
  });
  expect(response.resolution).toEqual({
    mode: "informational",
    source: "declaration",
    requestedProfileId: null,
    effectiveProfileId: "task/experimental@v9",
  });
  expect(response.trust).toEqual({
    mayReference: true,
    mayPlanFrom: false,
    mayExecuteFrom: false,
    requiresUserConfirmation: false,
  });
  expect(response.guidance).toEqual({
    codes: ["treat_as_plain_markdown"],
  });
});

test("resolveDocument reports structural contract failures without granting planning trust", async () => {
  const response = await resolveDocument({
    input: {
      kind: "path",
      path: "examples/invalid/body/missing-success-measures.project.md",
    },
    repoRoot,
    mode: "assistive",
  });

  expect(response.normalizedDocument.validation).toEqual({
    conformance: "recognized",
    errors: [
      {
        code: "required-section-missing",
        severity: "error",
        message:
          'Required section "Success measures" is missing for profile "project/basic@v1".',
        path: 'body.sections["Success measures"]',
      },
    ],
    warnings: [],
  });
  expect(response.profileResolution).toMatchObject({
    resolved: true,
    profile_id: "project/basic@v1",
    reason: null,
  });
  expect(response.trust).toEqual({
    mayReference: true,
    mayPlanFrom: false,
    mayExecuteFrom: false,
    requiresUserConfirmation: false,
  });
  expect(response.guidance).toEqual({
    codes: ["show_validation_warning"],
  });
});

test("resolveDocument degrades semantically invalid documents to warning-only trust", async () => {
  const response = await resolveDocument({
    input: {
      kind: "path",
      path: "examples/invalid/semantic/duplicate-objective.task.md",
    },
    repoRoot,
    mode: "assistive",
  });

  expect(response.normalizedDocument.validation).toEqual({
    conformance: "structurally_valid",
    errors: [
      {
        code: "normative-section-ambiguous",
        severity: "error",
        message:
          'Normative section "Objective" must appear at most once at the top level for profile "task/basic@v1".',
        path: 'body.sections["Objective"]',
      },
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
  expect(response.profileResolution).toMatchObject({
    resolved: true,
    profile_id: "task/basic@v1",
    reason: null,
  });
  expect(response.trust).toEqual({
    mayReference: true,
    mayPlanFrom: false,
    mayExecuteFrom: false,
    requiresUserConfirmation: false,
  });
  expect(response.guidance).toEqual({
    codes: ["show_validation_warning"],
  });
});

test("discoverDocuments returns deterministic summaries for declared and discovery-only matches", async () => {
  const response = await discoverDocuments({
    repoRoot,
    scopePaths: [
      "examples/invalid/declaration/undeclared.task.md",
      "examples/valid/task/basic.task.md",
    ],
    mode: "informational",
  });

  expect(response.documents).toHaveLength(2);
  expect(response.documents[0]).toEqual({
    path: "examples/invalid/declaration/undeclared.task.md",
    discoveryMatches: ["**/*.task.md"],
    declaration: null,
    resolved: {
      conformance: "candidate",
      profile: {
        resolved: false,
        profileId: null,
        profilePath: null,
        reason: "undeclared_profile",
      },
      resolution: {
        mode: "informational",
        source: "discovery_fallback",
        requestedProfileId: null,
        effectiveProfileId: "task/basic@v1",
      },
      trust: {
        mayReference: true,
        mayPlanFrom: false,
        mayExecuteFrom: false,
        requiresUserConfirmation: false,
      },
      guidance: {
        codes: ["treat_as_plain_markdown"],
      },
    },
  });
  expect(response.documents[1]).toMatchObject({
    path: "examples/valid/task/basic.task.md",
    discoveryMatches: ["**/*.task.md"],
    declaration: {
      docSpec: "agent-markdown/0.1",
      docKind: "task",
      docProfile: "task/basic@v1",
    },
    resolved: {
      conformance: "semantically_valid",
      profile: {
        resolved: true,
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
        reason: null,
      },
      resolution: {
        mode: "informational",
        source: "declaration",
        requestedProfileId: null,
        effectiveProfileId: "task/basic@v1",
      },
      trust: {
        mayReference: true,
        mayPlanFrom: true,
        mayExecuteFrom: false,
        requiresUserConfirmation: true,
      },
      guidance: {
        codes: ["request_user_confirmation"],
      },
    },
  });
});

test("discoverDocuments skips malformed frontmatter files instead of aborting the scan", async () => {
  const response = await discoverDocuments({
    repoRoot,
    scopePaths: ["examples"],
    mode: "informational",
  });

  expect(
    response.documents.some(
      (document) => document.path === "examples/valid/task/basic.task.md",
    ),
  ).toBe(true);
  expect(
    response.documents.some(
      (document) =>
        document.path === "examples/invalid/declaration/malformed-frontmatter.task.md",
    ),
  ).toBe(false);
});

test("discoverDocuments applies docKinds filters to declared documents without crashing", async () => {
  const response = await discoverDocuments({
    repoRoot,
    scopePaths: ["examples/valid/task/basic.task.md"],
    docKinds: ["task"],
    mode: "informational",
  });

  expect(response.documents).toHaveLength(1);
  expect(response.documents[0]).toMatchObject({
    path: "examples/valid/task/basic.task.md",
    declaration: {
      docKind: "task",
    },
  });
});

test("discoverDocuments applies filters to discovery-only candidates without dereferencing null declarations", async () => {
  const response = await discoverDocuments({
    repoRoot,
    scopePaths: ["examples/invalid/declaration/undeclared.task.md"],
    docKinds: ["task"],
    profileIds: ["task/basic@v1"],
    mode: "informational",
  });

  expect(response.documents).toHaveLength(1);
  expect(response.documents[0]).toMatchObject({
    path: "examples/invalid/declaration/undeclared.task.md",
    declaration: null,
    resolved: {
      profile: {
        reason: "undeclared_profile",
      },
    },
  });
});

test("discoverDocuments does not exclude instance documents just because they include a profile_id field", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "agent-markdown-discovery-"));
  const sourceMarkdown = await Bun.file(
    resolvePath(repoRoot, "examples/valid/task/basic.task.md"),
  ).text();
  const markdownWithProfileId = sourceMarkdown.replace(
    "doc_profile: task/basic@v1\n",
    'doc_profile: task/basic@v1\nprofile_id: "not-a-profile-spec"\n',
  );

  await writeFile(join(tempRoot, "instance.task.md"), markdownWithProfileId);

  try {
    const response = await discoverDocuments({
      repoRoot,
      scopePaths: [tempRoot],
      mode: "informational",
    });

    expect(response.documents).toHaveLength(1);
    expect(response.documents[0]).toMatchObject({
      path: expect.stringMatching(/instance\.task\.md$/u),
      declaration: {
        docProfile: "task/basic@v1",
      },
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("discoverDocuments excludes profile definition markdown from results", async () => {
  const response = await discoverDocuments({
    repoRoot,
    scopePaths: ["profiles"],
    mode: "informational",
  });

  expect(response.documents).toEqual([]);
});

test("discoverDocuments avoids following directory symlink cycles", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "agent-markdown-discovery-"));
  const fixtureMarkdown = await Bun.file(
    resolvePath(repoRoot, "examples/valid/task/basic.task.md"),
  ).text();

  await mkdir(join(tempRoot, "nested"));
  await writeFile(join(tempRoot, "loop.task.md"), fixtureMarkdown);
  await symlink(tempRoot, join(tempRoot, "nested", "back"));

  try {
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "-e",
        `
          import { discoverDocuments } from "./index.ts";

          const result = await discoverDocuments({
            repoRoot: ${JSON.stringify(repoRoot)},
            scopePaths: [${JSON.stringify(tempRoot)}],
            mode: "informational",
          });

          console.log(JSON.stringify(result));
        `,
      ],
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 2000,
    });

    expect(result.exitCode).toBe(0);
    expect(textDecoder.decode(result.stderr)).toBe("");

    const parsed = JSON.parse(textDecoder.decode(result.stdout));

    expect(parsed.documents).toHaveLength(1);
    expect(parsed.documents[0]).toMatchObject({
      declaration: {
        docProfile: "task/basic@v1",
      },
      resolved: {
        conformance: "semantically_valid",
      },
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("discoverDocuments skips dangling symlinks without aborting the walk", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "agent-markdown-discovery-"));
  const fixtureMarkdown = await Bun.file(
    resolvePath(repoRoot, "examples/valid/task/basic.task.md"),
  ).text();

  await mkdir(join(tempRoot, "nested"));
  await writeFile(join(tempRoot, "task.task.md"), fixtureMarkdown);
  await symlink(
    join(tempRoot, "missing-target"),
    join(tempRoot, "nested", "broken-link"),
  );

  try {
    const response = await discoverDocuments({
      repoRoot,
      scopePaths: [tempRoot],
      mode: "informational",
    });

    expect(response.documents).toHaveLength(1);
    expect(response.documents[0]).toMatchObject({
      path: expect.stringMatching(/task\.task\.md$/u),
      declaration: {
        docProfile: "task/basic@v1",
      },
      resolved: {
        conformance: "semantically_valid",
      },
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("explainProfile derives a reusable summary from the loaded registry entry", async () => {
  const response = await explainProfile({
    profileId: "task/basic@v1",
    repoRoot,
  });

  expect(response.profile.profile_id).toBe("task/basic@v1");
  expect(response.summary).toEqual({
    human:
      "Basic task profile defines task documents with 1 required metadata field and 4 required sections.",
    requiredMetadata: ["title"],
    optionalMetadata: ["status", "owners", "due_date"],
    requiredSections: [
      "Objective",
      "Context / Constraints",
      "Materially verifiable success criteria",
      "Execution notes",
    ],
    optionalSections: ["Dependencies", "Risks", "Notes"],
  });
});
