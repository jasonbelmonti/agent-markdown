export function exitWithError(error: unknown, exitCode: number): never {
  process.stderr.write(`${formatErrorMessage(error)}\n`);
  process.exit(exitCode);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
