import { formatBootstrapError, startAgentMarkdownMcpStdioServer } from "./index.ts";

async function main(): Promise<void> {
  const runtime = await startAgentMarkdownMcpStdioServer({
    repoRoot: readRepoRootFromArgs(process.argv.slice(2)),
  });

  const shutdown = async () => {
    await runtime.server.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
}

function readRepoRootFromArgs(argv: readonly string[]): string | undefined {
  if (argv.length === 0) {
    return undefined;
  }

  if (argv.length === 2 && argv[0] === "--repo-root") {
    return argv[1];
  }

  throw new Error(
    'Expected no arguments or "--repo-root <path>" when starting the MCP server.',
  );
}

main().catch((error) => {
  console.error(formatBootstrapError(error));
  process.exit(1);
});
