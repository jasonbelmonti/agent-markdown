import { lstat, readdir, realpath, stat } from "node:fs/promises";
import {
  isAbsolute,
  join,
  relative,
  resolve as resolvePath,
} from "node:path";

const skippedDirectoryNames = new Set([".git", "node_modules"]);

interface MarkdownPathWalkContext {
  canonicalRepoRoot: string;
  discoveredPaths: Set<string>;
  visitedDirectories: Set<string>;
}

interface MarkdownPathWalkOptions extends MarkdownPathWalkContext {
  absolutePath: string;
}

interface MarkdownDirectoryWalkOptions extends MarkdownPathWalkOptions {
  canonicalPath?: string;
}

export async function listScopedMarkdownPaths(
  repoRoot: string,
  scopePaths: readonly string[] | undefined,
): Promise<string[]> {
  const canonicalRepoRoot = await realpath(repoRoot);
  const discoveredPaths = new Set<string>();
  const visitedDirectories = new Set<string>();
  const scopedPaths = scopePaths && scopePaths.length > 0 ? scopePaths : ["."];
  const walkContext = {
    canonicalRepoRoot,
    discoveredPaths,
    visitedDirectories,
  } satisfies MarkdownPathWalkContext;

  for (const scopePath of scopedPaths) {
    await collectMarkdownPaths({
      absolutePath: await resolveScopedPath(
        repoRoot,
        canonicalRepoRoot,
        scopePath,
      ),
      ...walkContext,
    });
  }

  return [...discoveredPaths].sort();
}

async function collectMarkdownPaths(
  options: MarkdownPathWalkOptions,
): Promise<void> {
  const entry = await lstat(options.absolutePath).catch(() => null);

  if (entry === null) {
    throw new Error(`Scope path does not exist: ${options.absolutePath}`);
  }

  if (entry.isSymbolicLink()) {
    await collectSymbolicLinkMarkdownPaths(options);
    return;
  }

  if (entry.isDirectory()) {
    await collectDirectoryMarkdownPaths(options);
    return;
  }

  collectMarkdownFile(options.absolutePath, entry.isFile(), options.discoveredPaths);
}

async function collectSymbolicLinkMarkdownPaths(
  options: MarkdownPathWalkOptions,
): Promise<void> {
  const canonicalPath = await realpath(options.absolutePath).catch(() => null);
  const targetEntry = await stat(options.absolutePath).catch(() => null);

  if (canonicalPath === null || targetEntry === null) {
    return;
  }

  if (!isWithinRoot(canonicalPath, options.canonicalRepoRoot)) {
    return;
  }

  if (targetEntry.isDirectory()) {
    await collectDirectoryMarkdownPaths({
      ...options,
      canonicalPath,
    });
    return;
  }

  collectMarkdownFile(
    options.absolutePath,
    targetEntry.isFile(),
    options.discoveredPaths,
  );
}

async function collectDirectoryMarkdownPaths(
  options: MarkdownDirectoryWalkOptions,
): Promise<void> {
  const directoryPath =
    options.canonicalPath ?? (await realpath(options.absolutePath));

  if (!isWithinRoot(directoryPath, options.canonicalRepoRoot)) {
    return;
  }

  // Break cycles when the same directory is reachable through a symlink alias.
  if (options.visitedDirectories.has(directoryPath)) {
    return;
  }

  options.visitedDirectories.add(directoryPath);

  const childEntries = await readdir(options.absolutePath, {
    withFileTypes: true,
  });

  childEntries.sort((left, right) => left.name.localeCompare(right.name));

  for (const childEntry of childEntries) {
    if (
      skippedDirectoryNames.has(childEntry.name) &&
      (childEntry.isDirectory() || childEntry.isSymbolicLink())
    ) {
      continue;
    }

    await collectMarkdownPaths({
      absolutePath: join(options.absolutePath, childEntry.name),
      canonicalRepoRoot: options.canonicalRepoRoot,
      discoveredPaths: options.discoveredPaths,
      visitedDirectories: options.visitedDirectories,
    });
  }
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

function collectMarkdownFile(
  absolutePath: string,
  isFile: boolean,
  discoveredPaths: Set<string>,
): void {
  if (isFile && isMarkdownPath(absolutePath)) {
    discoveredPaths.add(absolutePath);
  }
}

async function resolveScopedPath(
  repoRoot: string,
  canonicalRepoRoot: string,
  scopePath: string,
): Promise<string> {
  const resolvedScopePath = resolvePath(repoRoot, scopePath);
  const canonicalScopePath = await realpath(resolvedScopePath).catch(() => null);

  if (canonicalScopePath !== null) {
    return reanchorScopedPath({
      repoRoot,
      canonicalRepoRoot,
      scopePath,
      containmentPath: canonicalScopePath,
    });
  }

  if (isWithinRoot(resolvedScopePath, repoRoot)) {
    return resolvedScopePath;
  }

  return reanchorScopedPath({
    repoRoot,
    canonicalRepoRoot,
    scopePath,
    containmentPath: resolvedScopePath,
  });
}

function reanchorScopedPath(options: {
  repoRoot: string;
  canonicalRepoRoot: string;
  scopePath: string;
  containmentPath: string;
}): string {
  if (!isWithinRoot(options.containmentPath, options.canonicalRepoRoot)) {
    throw new Error(`Scope path resolves outside repo root: ${options.scopePath}`);
  }

  const repoRelativeScopePath = relative(
    options.canonicalRepoRoot,
    options.containmentPath,
  );

  return resolvePath(options.repoRoot, repoRelativeScopePath);
}

export function isWithinRoot(
  path: string,
  root: string,
  pathOperations: Pick<typeof import("node:path"), "isAbsolute" | "relative"> = {
    isAbsolute,
    relative,
  },
): boolean {
  const relativePath = pathOperations.relative(root, path);

  return (
    relativePath === "" ||
    (!pathOperations.isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith("../") &&
      !relativePath.startsWith("..\\"))
  );
}
