import type { CallToolResult } from "@modelcontextprotocol/server";

import type { AgentMarkdownMcpToolError } from "./error-mapping.ts";

export async function executeResolverTool<TResponse extends object>(
  execute: () => Promise<TResponse>,
  mapError: (error: unknown) => AgentMarkdownMcpToolError,
): Promise<CallToolResult> {
  try {
    return createSuccessResult(await execute());
  } catch (error) {
    return createErrorResult(mapError(error));
  }
}

function createSuccessResult<TResponse extends object>(
  response: TResponse,
): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
    structuredContent: { ...response } as Record<string, unknown>,
  };
}

function createErrorResult(error: AgentMarkdownMcpToolError): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `[${error.code}] ${error.message}`,
      },
    ],
    structuredContent: {
      code: error.code,
      message: error.message,
      ...(error.cause ? { cause: error.cause } : {}),
    },
    isError: true,
  };
}
