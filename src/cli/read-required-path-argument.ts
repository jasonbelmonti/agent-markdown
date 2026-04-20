const normalizeUsage = "Usage: bun run normalize <path>";

export function readRequiredPathArgument(argv: readonly string[]): string {
  const [path, ...unexpected] = argv;

  if (path === undefined) {
    throw new Error(`Missing document path.\n${normalizeUsage}`);
  }

  if (unexpected.length > 0) {
    throw new Error(`Expected exactly one document path.\n${normalizeUsage}`);
  }

  return path;
}
