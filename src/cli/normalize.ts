import { normalizeDocumentPath } from "./normalize-document-path.ts";
import { readRequiredPathArgument } from "./read-required-path-argument.ts";

try {
  await main();
} catch (error) {
  exitWithError(error);
}

async function main(): Promise<void> {
  const path = readRequiredPathArgument(process.argv.slice(2));
  const normalized = await normalizeDocumentPath({ path });

  process.stdout.write(`${JSON.stringify(normalized, null, 2)}\n`);
}

function exitWithError(error: unknown): never {
  process.stderr.write(`${formatErrorMessage(error)}\n`);
  process.exit(1);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
