import { exitWithError } from "./exit-with-error.ts";
import { readRequiredPathArgument } from "./read-required-path-argument.ts";
import { validateDocumentPath } from "./validate-document-path.ts";

const commandName = "validate";
const unexpectedFailureExitCode = 2;

try {
  await main();
} catch (error) {
  exitWithError(error, unexpectedFailureExitCode);
}

async function main(): Promise<void> {
  const path = readRequiredPathArgument(process.argv.slice(2), {
    commandName,
  });
  const validation = await validateDocumentPath({ path });

  process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
  process.exitCode = validation.valid ? 0 : 1;
}
