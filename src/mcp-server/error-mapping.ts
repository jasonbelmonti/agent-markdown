export type AgentMarkdownMcpErrorCode =
  | "startup_failed"
  | "unsupported_input"
  | "document_not_found"
  | "scope_not_found"
  | "unknown_profile"
  | "resolver_failed";

export type AgentMarkdownMcpToolError = {
  code: Exclude<AgentMarkdownMcpErrorCode, "startup_failed">;
  message: string;
  cause?: string;
};

export class AgentMarkdownMcpBootstrapError extends Error {
  readonly code = "startup_failed" as const;
  readonly causeMessage?: string;

  constructor(message: string, options: { causeMessage?: string } = {}) {
    super(message);
    this.name = "AgentMarkdownMcpBootstrapError";
    this.causeMessage = options.causeMessage;
  }
}

export function createBootstrapError(error: unknown): AgentMarkdownMcpBootstrapError {
  return new AgentMarkdownMcpBootstrapError(
    "Failed to start agent-markdown MCP server.",
    { causeMessage: toErrorMessage(error) },
  );
}

export function formatBootstrapError(error: unknown): string {
  if (error instanceof AgentMarkdownMcpBootstrapError) {
    return formatErrorLine(error.code, error.message, error.causeMessage);
  }

  return formatErrorLine(
    "startup_failed",
    "Failed to start agent-markdown MCP server.",
    toErrorMessage(error),
  );
}

export function mapResolverToolError(error: unknown): AgentMarkdownMcpToolError {
  const cause = toErrorMessage(error);

  if (
    cause.startsWith(
      "Document input is not Markdown and did not match any registered discovery hint:",
    )
  ) {
    return {
      code: "unsupported_input",
      message: "Document input must be Markdown content or a Markdown path.",
      cause,
    };
  }

  if (cause.startsWith("Document path does not exist:")) {
    return {
      code: "document_not_found",
      message: "Document path does not exist.",
      cause,
    };
  }

  if (cause.startsWith("Scope path does not exist:")) {
    return {
      code: "scope_not_found",
      message: "One or more discovery scope paths do not exist.",
      cause,
    };
  }

  if (cause.startsWith("Unknown profile ")) {
    return {
      code: "unknown_profile",
      message: "Requested profile is not registered.",
      cause,
    };
  }

  return {
    code: "resolver_failed",
    message: "Resolver operation failed.",
    cause,
  };
}

function formatErrorLine(
  code: AgentMarkdownMcpErrorCode,
  message: string,
  cause: string | undefined,
): string {
  return cause ? `[${code}] ${message} Cause: ${cause}` : `[${code}] ${message}`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
