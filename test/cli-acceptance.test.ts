import { expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

const repoRoot = resolvePath(import.meta.dir, "..");
const validateCommandName = "validate";
const normalizeCommandName = "normalize";
const validFixtures = [
  {
    path: "examples/valid/brief/basic.brief.md",
    validateExpected: {
      declaration: {
        docKind: "brief",
        docProfile: "brief/basic@v1",
        title: "Recommend a stable example layout",
      },
      profile: {
        resolved: true,
        profileId: "brief/basic@v1",
        profilePath: "profiles/brief/basic.profile.md",
        reason: null,
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      valid: true,
    },
    normalizeExpected: {
      declaration: {
        docKind: "brief",
        docProfile: "brief/basic@v1",
      },
      profile: {
        resolved: true,
        profileId: "brief/basic@v1",
        profilePath: "profiles/brief/basic.profile.md",
      },
      metadata: {
        audience: ["maintainers", "tooling authors"],
        owners: ["agent-markdown maintainers"],
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      affordances: {
        role: "context",
        actionability: "reference",
      },
    },
  },
  {
    path: "examples/valid/task/basic.task.md",
    validateExpected: {
      declaration: {
        docKind: "task",
        docProfile: "task/basic@v1",
        title: "Publish the MVP task example",
      },
      profile: {
        resolved: true,
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
        reason: null,
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      valid: true,
    },
    normalizeExpected: {
      declaration: {
        docKind: "task",
        docProfile: "task/basic@v1",
      },
      profile: {
        resolved: true,
        profileId: "task/basic@v1",
        profilePath: "profiles/task/basic.profile.md",
      },
      metadata: {
        status: "ready",
        owners: ["agent-markdown maintainers"],
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      affordances: {
        role: "work",
        actionability: "execute",
      },
    },
  },
  {
    path: "examples/valid/project/basic.project.md",
    validateExpected: {
      declaration: {
        docKind: "project",
        docProfile: "project/basic@v1",
        title: "Coordinate the MVP fixture corpus",
      },
      profile: {
        resolved: true,
        profileId: "project/basic@v1",
        profilePath: "profiles/project/basic.profile.md",
        reason: null,
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      valid: true,
    },
    normalizeExpected: {
      declaration: {
        docKind: "project",
        docProfile: "project/basic@v1",
      },
      profile: {
        resolved: true,
        profileId: "project/basic@v1",
        profilePath: "profiles/project/basic.profile.md",
      },
      metadata: {
        status: "active",
        owners: ["agent-markdown maintainers"],
        horizon: "MVP",
      },
      validation: {
        conformance: "semantically_valid",
        errors: [],
        warnings: [],
      },
      affordances: {
        role: "coordination",
        actionability: "plan",
      },
    },
  },
] as const;
const semanticInvalidFixturePath =
  "examples/invalid/semantic/duplicate-objective.task.md";
const malformedFrontmatterFixturePath =
  "examples/invalid/declaration/malformed-frontmatter.task.md";
const malformedFrontmatterErrorMessage =
  'Document "examples/invalid/declaration/malformed-frontmatter.task.md" has malformed YAML frontmatter: missing closing delimiter.\n';
const textDecoder = new TextDecoder();
const semanticInvalidValidation = {
  conformance: "structurally_valid",
  errors: [
    {
      code: "normative-section-ambiguous",
      severity: "error",
    },
  ],
  warnings: [
    {
      code: "degraded-affordance",
      severity: "warning",
    },
  ],
};

// Keep the acceptance lane high-signal; detailed JSON determinism lives in the
// command-specific CLI proof tests.
test("CLI acceptance gate accepts all shipped valid MVP fixtures", () => {
  for (const fixture of validFixtures) {
    const { validateResult, normalizeResult } = runAcceptanceCommands(fixture.path);

    expectJsonCommandResult(validateResult, {
      commandName: validateCommandName,
      exitCode: 0,
      expected: fixture.validateExpected,
    });

    expectJsonCommandResult(normalizeResult, {
      commandName: normalizeCommandName,
      exitCode: 0,
      expected: fixture.normalizeExpected,
    });
  }
});

test("CLI acceptance gate preserves command-specific behavior for parseable invalid fixtures", () => {
  const { validateResult, normalizeResult } = runAcceptanceCommands(
    semanticInvalidFixturePath,
  );

  expectJsonCommandResult(validateResult, {
    commandName: validateCommandName,
    exitCode: 1,
    expected: {
      profile: {
        resolved: true,
        profileId: "task/basic@v1",
        reason: null,
      },
      validation: semanticInvalidValidation,
      valid: false,
    },
  });

  expectJsonCommandResult(normalizeResult, {
    commandName: normalizeCommandName,
    exitCode: 0,
    expected: {
      profile: {
        resolved: true,
        profileId: "task/basic@v1",
      },
      validation: semanticInvalidValidation,
      affordances: {
        actionability: null,
      },
    },
  });
});

test("CLI acceptance gate preserves hard-failure semantics for malformed fixtures", () => {
  const { validateResult, normalizeResult } = runAcceptanceCommands(
    malformedFrontmatterFixturePath,
  );

  expectCommandFailure(validateResult, {
    commandName: validateCommandName,
    exitCode: 2,
    expectedMessage: malformedFrontmatterErrorMessage,
  });

  expectCommandFailure(normalizeResult, {
    commandName: normalizeCommandName,
    exitCode: 1,
    expectedMessage: malformedFrontmatterErrorMessage,
  });
});

function runAcceptanceCommands(path: string) {
  return {
    validateResult: runCliCommand(validateCommandName, path),
    normalizeResult: runCliCommand(normalizeCommandName, path),
  };
}

function runCliCommand(commandName: CliCommandName, path: string): CliCommandResult {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", commandName, path],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: result.exitCode,
    stdout: textDecoder.decode(result.stdout),
    stderr: textDecoder.decode(result.stderr),
  };
}

function expectJsonCommandResult(
  result: CliCommandResult,
  options: {
    commandName: CliCommandName;
    exitCode: number;
    expected: Record<string, unknown>;
  },
) {
  expect(result.exitCode).toBe(options.exitCode);
  expect(cleanStderr(options.commandName, result.stderr)).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject(options.expected);
}

function expectCommandFailure(
  result: CliCommandResult,
  options: {
    commandName: CliCommandName;
    exitCode: number;
    expectedMessage: string;
  },
) {
  expect(result.exitCode).toBe(options.exitCode);
  expect(result.stdout).toBe("");
  expect(cleanStderr(options.commandName, result.stderr)).toBe(
    options.expectedMessage,
  );
}

function cleanStderr(commandName: CliCommandName, stderr: string): string {
  return stderr
    .replace(
      new RegExp(`^\\$ bun run \\.\\/src\\/cli\\/${commandName}\\.ts.*\\n`, "u"),
      "",
    )
    .replace(/error: script "[^"]+" exited with code \d+\n$/u, "");
}

type CliCommandName = typeof normalizeCommandName | typeof validateCommandName;

interface CliCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
