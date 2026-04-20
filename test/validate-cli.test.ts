import { expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

const repoRoot = resolvePath(import.meta.dir, "..");
const validFixturePath = "examples/valid/task/basic.task.md";
const expectedNormalizedFixturePath =
  "test/fixtures/normalize/basic-task.expected.json";
const unknownProfileFixturePath =
  "examples/invalid/profile/unknown-profile.task.md";
const semanticInvalidFixturePath =
  "examples/invalid/semantic/duplicate-objective.task.md";
const malformedFrontmatterFixturePath =
  "examples/invalid/declaration/malformed-frontmatter.task.md";
const jsonDecoder = new TextDecoder();
const unknownProfileExpected = {
  source: {
    path: unknownProfileFixturePath,
    contentHash: "sha256:2b0b3422c50914c1079b02fb34ef4d5611a43b7a0ebfcc8f55d041a98aa77b10",
    discoveryMatches: ["**/*.task.md"],
  },
  declaration: {
    docSpec: "agent-markdown/0.1",
    docKind: "task",
    docProfile: "task/experimental@v9",
    title: "Exercise unknown profile handling",
  },
  profile: {
    resolved: false,
    profileId: null,
    profilePath: null,
    reason: "unknown_profile",
  },
  validation: {
    conformance: "candidate",
    errors: [],
    warnings: [],
  },
  valid: false,
} satisfies ValidateCommandResult;
const semanticInvalidExpected = {
  source: {
    path: semanticInvalidFixturePath,
    contentHash: "sha256:13e0ae1a84574208b03ceffee71d45cdda0ab32ffc1ab11e5d4455ea1a9f293a",
    discoveryMatches: ["**/*.task.md"],
  },
  declaration: {
    docSpec: "agent-markdown/0.1",
    docKind: "task",
    docProfile: "task/basic@v1",
    title: "Reject ambiguous normative sections",
  },
  profile: {
    resolved: true,
    profileId: "task/basic@v1",
    profilePath: "profiles/task/basic.profile.md",
    reason: null,
  },
  validation: {
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
  },
  valid: false,
} satisfies ValidateCommandResult;

test("bun run validate emits deterministic validation JSON for a conformant fixture", async () => {
  const expected = await loadExpectedValidFixture();
  const firstRun = runValidateCommand(validFixturePath);
  const secondRun = runValidateCommand(validFixturePath);

  expect(firstRun.exitCode).toBe(0);
  expect(secondRun.exitCode).toBe(0);
  expect(stripBunRunnerEcho(firstRun.stderr)).toBe("");
  expect(stripBunRunnerEcho(secondRun.stderr)).toBe("");
  expect(firstRun.stdout).toBe(secondRun.stdout);
  expect(firstRun.stdout).toBe(`${JSON.stringify(expected, null, 2)}\n`);
  expect(JSON.parse(firstRun.stdout)).toEqual(expected);
});

test("bun run validate honors declared semantics when a repo-local markdown path does not match discovery hints", async () => {
  const renamedPath = "tmp.validate-fixture.md";
  const expected = await loadExpectedValidFixture();
  const sourceMarkdown = await Bun.file(resolvePath(repoRoot, validFixturePath)).text();

  await Bun.write(resolvePath(repoRoot, renamedPath), sourceMarkdown);

  try {
    const result = runValidateCommand(renamedPath);

    expect(result.exitCode).toBe(0);
    expect(stripBunRunnerEcho(result.stderr)).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ...expected,
      source: {
        ...expected.source,
        path: renamedPath,
        discoveryMatches: [],
      },
    });
  } finally {
    await Bun.file(resolvePath(repoRoot, renamedPath)).delete();
  }
});

test("bun run validate exits 1 and surfaces explicit profile-resolution context for candidate documents", async () => {
  const result = runValidateCommand(unknownProfileFixturePath);

  expectJsonCommandResult(result, {
    exitCode: 1,
    expected: unknownProfileExpected,
  });
});

test("bun run validate exits 1 and surfaces deterministic semantic failures and warnings", async () => {
  const result = runValidateCommand(semanticInvalidFixturePath);

  expectJsonCommandResult(result, {
    exitCode: 1,
    expected: semanticInvalidExpected,
  });
});

test("bun run validate exits 2 for malformed frontmatter and prints a deterministic loader error", () => {
  const result = runValidateCommand(malformedFrontmatterFixturePath);

  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(stripBunRunnerEcho(result.stderr)).toBe(
    'Document "examples/invalid/declaration/malformed-frontmatter.task.md" has malformed YAML frontmatter: missing closing delimiter.\n',
  );
});

function runValidateCommand(path: string) {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "validate", path],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: result.exitCode,
    stdout: jsonDecoder.decode(result.stdout),
    stderr: jsonDecoder.decode(result.stderr),
  };
}

async function loadExpectedValidFixture() {
  const normalized = JSON.parse(
    await Bun.file(resolvePath(repoRoot, expectedNormalizedFixturePath)).text(),
  );

  return {
    source: {
      path: normalized.source.path,
      contentHash: normalized.source.contentHash,
      discoveryMatches: normalized.source.discoveryMatches,
    },
    declaration: normalized.declaration,
    profile: {
      resolved: normalized.profile.resolved,
      profileId: normalized.profile.profileId,
      profilePath: normalized.profile.profilePath,
      reason: null,
    },
    validation: normalized.validation,
    valid: true,
  };
}

function stripBunRunnerEcho(stderr: string): string {
  return stderr
    .replace(/^\$ bun run \.\/src\/cli\/validate\.ts.*\n/u, "")
    .replace(/error: script "validate" exited with code \d+\n$/u, "");
}

function expectJsonCommandResult(
  result: ReturnType<typeof runValidateCommand>,
  options: {
    exitCode: number;
    expected: ValidateCommandResult;
  },
) {
  expect(result.exitCode).toBe(options.exitCode);
  expect(stripBunRunnerEcho(result.stderr)).toBe("");
  expect(result.stdout).toBe(`${JSON.stringify(options.expected, null, 2)}\n`);
  expect(JSON.parse(result.stdout)).toEqual(options.expected);
}

interface ValidateCommandResult {
  source: {
    path: string;
    contentHash: string;
    discoveryMatches: string[];
  };
  declaration: {
    docSpec: string | null;
    docKind: string | null;
    docProfile: string | null;
    title: string | null;
  };
  profile: {
    resolved: boolean;
    profileId: string | null;
    profilePath: string | null;
    reason: string | null;
  };
  validation: {
    conformance: string;
    errors: Array<{
      code: string;
      severity: string;
      message: string;
      path?: string;
    }>;
    warnings: Array<{
      code: string;
      severity: string;
      message: string;
      path?: string;
    }>;
  };
  valid: boolean;
}
