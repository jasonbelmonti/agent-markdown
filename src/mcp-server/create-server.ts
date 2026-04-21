import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { resolve as resolvePath } from "node:path";
import type { Readable, Writable } from "node:stream";

import { loadResolverContext } from "../resolver-core/index.ts";

import {
  AgentMarkdownMcpBootstrapError,
  createBootstrapError,
} from "./error-mapping.ts";
import { registerResolverTools } from "./register-resolver-tools.ts";

const agentMarkdownMcpInstructions = [
  "Use the agent_markdown tools when a client needs discovery, declaration sniffing, full resolution, or profile explanation for Markdown documents.",
  "Resolver semantics come from declared profiles and shared repo logic; do not reinterpret document meaning in the transport layer.",
  "Treat malformed or unsupported input as resolver errors rather than plain Markdown success.",
].join(" ");

export interface CreateAgentMarkdownMcpServerOptions {
  repoRoot?: string;
  createServer?: () => McpServer;
}

export interface StartAgentMarkdownMcpStdioServerOptions
  extends CreateAgentMarkdownMcpServerOptions {
  stdin?: Readable;
  stdout?: Writable;
}

export interface AgentMarkdownMcpServerRuntime {
  repoRoot: string;
  server: McpServer;
}

export interface AgentMarkdownMcpStdioRuntime
  extends AgentMarkdownMcpServerRuntime {
  transport: StdioServerTransport;
}

export async function createAgentMarkdownMcpServer(
  options: CreateAgentMarkdownMcpServerOptions = {},
): Promise<AgentMarkdownMcpServerRuntime> {
  const requestedRepoRoot = resolvePath(options.repoRoot ?? process.cwd());
  const repoRoot = await preloadResolverContext(requestedRepoRoot);
  const server = options.createServer?.() ?? createDefaultServer();

  registerResolverTools(server, { repoRoot });

  return {
    repoRoot,
    server,
  };
}

export async function startAgentMarkdownMcpStdioServer(
  options: StartAgentMarkdownMcpStdioServerOptions = {},
): Promise<AgentMarkdownMcpStdioRuntime> {
  const runtime = await createAgentMarkdownMcpServer(options);
  const transport = new StdioServerTransport(options.stdin, options.stdout);

  try {
    await runtime.server.connect(transport);
  } catch (error) {
    throw error instanceof AgentMarkdownMcpBootstrapError
      ? error
      : createBootstrapError(error);
  }

  return {
    ...runtime,
    transport,
  };
}

async function preloadResolverContext(repoRoot: string): Promise<string> {
  try {
    const context = await loadResolverContext({ repoRoot });
    return context.repoRoot;
  } catch (error) {
    throw createBootstrapError(error);
  }
}

function createDefaultServer(): McpServer {
  return new McpServer(
    {
      name: "agent-markdown",
      version: "0.1.0",
    },
    {
      instructions: agentMarkdownMcpInstructions,
    },
  );
}
