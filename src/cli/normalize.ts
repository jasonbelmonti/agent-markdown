import { exitWithError } from "./exit-with-error.ts";
import { normalizeDocumentPath } from "./normalize-document-path.ts";
import { readRequiredPathArgument } from "./read-required-path-argument.ts";

try {
  await main();
} catch (error) {
  exitWithError(error, 1);
}

async function main(): Promise<void> {
  const path = readRequiredPathArgument(process.argv.slice(2), {
    commandName: "normalize",
  });
  const normalized = await normalizeDocumentPath({ path });

  process.stdout.write(`${JSON.stringify(normalized, null, 2)}\n`);
}
