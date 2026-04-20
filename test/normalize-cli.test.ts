import { expect, test } from "bun:test";
import { resolve as resolvePath } from "node:path";

const repoRoot = resolvePath(import.meta.dir, "..");
const fixturePath = "examples/valid/task/basic.task.md";
const expectedFixturePath = "test/fixtures/normalize/basic-task.expected.json";
const jsonDecoder = new TextDecoder();
const expectedTopLevelKeys = [
  "source",
  "declaration",
  "profile",
  "metadata",
  "body",
  "validation",
  "affordances",
  "extensions",
];

test("bun run normalize emits deterministic canonical JSON for a valid fixture", async () => {
  const expected = await loadExpectedNormalizedFixture();
  const firstRun = runNormalizeCommand(fixturePath);
  const secondRun = runNormalizeCommand(fixturePath);

  expect(firstRun.exitCode).toBe(0);
  expect(secondRun.exitCode).toBe(0);
  expect(stripBunRunnerEcho(firstRun.stderr)).toBe("");
  expect(stripBunRunnerEcho(secondRun.stderr)).toBe("");
  expect(firstRun.stdout).toBe(secondRun.stdout);
  expect(firstRun.stdout).toBe(`${JSON.stringify(expected, null, 2)}\n`);

  const parsed = JSON.parse(firstRun.stdout);

  expect(Object.keys(parsed)).toEqual(expectedTopLevelKeys);
  expect(parsed).toEqual(expected);
});

test("bun run normalize honors declared semantics when a repo-local markdown path does not match discovery hints", async () => {
  const renamedPath = "tmp.normalize-fixture.md";
  const expected = await loadExpectedNormalizedFixture();
  const sourceMarkdown = await Bun.file(resolvePath(repoRoot, fixturePath)).text();

  await Bun.write(resolvePath(repoRoot, renamedPath), sourceMarkdown);

  try {
    const result = runNormalizeCommand(renamedPath);

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

function runNormalizeCommand(path: string) {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "normalize", path],
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

async function loadExpectedNormalizedFixture() {
  return JSON.parse(
    await Bun.file(resolvePath(repoRoot, expectedFixturePath)).text(),
  );
}

function stripBunRunnerEcho(stderr: string): string {
  return stderr.replace(/^\$ bun run \.\/src\/cli\/normalize\.ts .*\n/u, "");
}
