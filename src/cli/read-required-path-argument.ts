export interface ReadRequiredPathArgumentOptions {
  commandName: string;
}

export function readRequiredPathArgument(
  argv: readonly string[],
  options: ReadRequiredPathArgumentOptions,
): string {
  const [path, ...unexpected] = argv;
  const usage = `Usage: bun run ${options.commandName} <path>`;

  if (path === undefined) {
    throw new Error(`Missing document path.\n${usage}`);
  }

  if (unexpected.length > 0) {
    throw new Error(`Expected exactly one document path.\n${usage}`);
  }

  return path;
}
