import type { McpServer } from "@modelcontextprotocol/server";

import {
  discoverDocuments,
  explainProfile,
  resolveDocument,
  sniffDocument,
} from "../resolver-core/index.ts";
import {
  discoverRequestSchema,
  discoverResponseSchema,
  explainProfileRequestSchema,
  explainProfileResponseSchema,
  resolveRequestSchema,
  resolveResponseSchema,
  sniffRequestSchema,
  sniffResponseSchema,
} from "./contracts.ts";
import { mapResolverToolError } from "./error-mapping.ts";
import { executeResolverTool } from "./tool-results.ts";

export const agentMarkdownResolverToolNames = {
  sniff: "agent_markdown.sniff",
  resolve: "agent_markdown.resolve",
  discover: "agent_markdown.discover",
  explainProfile: "agent_markdown.explain_profile",
} as const;

export interface RegisterResolverToolsOptions {
  repoRoot: string;
}

export function registerResolverTools(
  server: McpServer,
  options: RegisterResolverToolsOptions,
): void {
  server.registerTool(
    agentMarkdownResolverToolNames.sniff,
    {
      title: "Sniff agent-markdown documents",
      description:
        "Quickly inspect Markdown input for agent-markdown declarations or discovery hints.",
      inputSchema: sniffRequestSchema,
      outputSchema: sniffResponseSchema,
    },
    async (request) => executeResolverTool(() =>
      sniffDocument(withDefaultRepoRoot(request, options.repoRoot)), mapResolverToolError),
  );

  server.registerTool(
    agentMarkdownResolverToolNames.resolve,
    {
      title: "Resolve an agent-markdown document",
      description:
        "Resolve a Markdown input through declaration parsing, profile lookup, normalization, validation, and trust guidance.",
      inputSchema: resolveRequestSchema,
      outputSchema: resolveResponseSchema,
    },
    async (request) => executeResolverTool(() =>
      resolveDocument(withDefaultRepoRoot(request, options.repoRoot)), mapResolverToolError),
  );

  server.registerTool(
    agentMarkdownResolverToolNames.discover,
    {
      title: "Discover agent-markdown documents",
      description:
        "Search a repository for candidate agent-markdown documents and optionally resolve them.",
      inputSchema: discoverRequestSchema,
      outputSchema: discoverResponseSchema,
    },
    async (request) => executeResolverTool(
      () => discoverDocuments(withDefaultRepoRoot(request, options.repoRoot)),
      mapResolverToolError,
    ),
  );

  server.registerTool(
    agentMarkdownResolverToolNames.explainProfile,
    {
      title: "Explain an agent-markdown profile",
      description:
        "Return the resolved profile contract plus a concise human-readable summary.",
      inputSchema: explainProfileRequestSchema,
      outputSchema: explainProfileResponseSchema,
    },
    async (request) => executeResolverTool(() =>
      explainProfile(withDefaultRepoRoot(request, options.repoRoot)), mapResolverToolError),
  );
}

function withDefaultRepoRoot<
  TRequest extends {
    repoRoot?: string;
  },
>(
  request: TRequest,
  repoRoot: string,
): TRequest & { repoRoot: string } {
  return {
    ...request,
    repoRoot: request.repoRoot ?? repoRoot,
  } as TRequest & { repoRoot: string };
}
