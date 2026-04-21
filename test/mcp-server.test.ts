import { afterEach, expect, test } from "bun:test";
import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import { LATEST_PROTOCOL_VERSION, serializeMessage } from "@modelcontextprotocol/server";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  AgentMarkdownMcpBootstrapError,
  agentMarkdownResolverToolNames,
  createAgentMarkdownMcpServer,
  startAgentMarkdownMcpStdioServer,
} from "../index.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const runtimesToClose: Array<{
  server: {
    close(): Promise<void>;
  };
}> = [];

afterEach(async () => {
  while (runtimesToClose.length > 0) {
    await runtimesToClose.pop()?.server.close();
  }
});

test("starts a stdio MCP server that exposes the four resolver tools", async () => {
  const client = await createTestClient();

  const listedTools = await client.listTools();

  expect(listedTools.map((tool) => tool.name).sort()).toEqual(
    Object.values(agentMarkdownResolverToolNames).sort(),
  );

  for (const tool of listedTools) {
    expect(tool.inputSchema?.type).toBe("object");
    expect(tool.outputSchema?.type).toBe("object");
  }

  const sniffResult = await client.callTool(agentMarkdownResolverToolNames.sniff, {
    input: {
      kind: "path",
      path: "examples/valid/task/basic.task.md",
    },
  });

  expect(sniffResult.isError).toBeUndefined();
  expect(sniffResult.structuredContent).toMatchObject({
    recommendation: "resolve",
    declaration: {
      docKind: "task",
      docProfile: "task/basic@v1",
    },
  });
});

test("returns deterministic unsupported-input tool errors", async () => {
  const client = await createTestClient();

  const result = await client.callTool(agentMarkdownResolverToolNames.sniff, {
    input: {
      kind: "path",
      path: "package.json",
    },
  });

  expect(result.isError).toBe(true);
  expect(result.content[0]?.text).toBe(
    "[unsupported_input] Document input must be Markdown content or a Markdown path.",
  );
  expect(result.structuredContent).toEqual({
    code: "unsupported_input",
    message: "Document input must be Markdown content or a Markdown path.",
    cause:
      `Document input is not Markdown and did not match any registered discovery hint: ${join(repoRoot, "package.json")}`,
  });
});

test("allows discover to omit repoRoot when the server was bootstrapped with one", async () => {
  const client = await createTestClient();

  const result = await client.callTool(agentMarkdownResolverToolNames.discover, {
    scopePaths: ["examples/valid"],
  });

  expect(result.isError).toBeUndefined();
  expect(result.structuredContent).toMatchObject({
    documents: expect.arrayContaining([
      expect.objectContaining({
        path: expect.stringContaining("examples/valid/task/basic.task.md"),
      }),
    ]),
  });
});

test("fails startup deterministically when the resolver context cannot load", async () => {
  await expect(
    createAgentMarkdownMcpServer({
      repoRoot: "/tmp/agent-markdown-missing-repo",
    }),
  ).rejects.toBeInstanceOf(AgentMarkdownMcpBootstrapError);

  await expect(
    createAgentMarkdownMcpServer({
      repoRoot: "/tmp/agent-markdown-missing-repo",
    }),
  ).rejects.toMatchObject({
    code: "startup_failed",
    message: "Failed to start agent-markdown MCP server.",
  });
});

async function createTestClient(): Promise<TestMcpClient> {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const runtime = await startAgentMarkdownMcpStdioServer({
    repoRoot,
    stdin,
    stdout,
  });
  const client = new TestMcpClient(stdin, stdout);

  runtimesToClose.push(runtime);
  await client.initialize();

  return client;
}

class TestMcpClient {
  private readonly pending = new Map<number, (message: JsonRpcResponse) => void>();
  private readonly stdin: PassThrough;
  private nextId = 1;
  private buffer = "";

  constructor(stdin: PassThrough, stdout: PassThrough) {
    this.stdin = stdin;
    stdout.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      this.flushMessages();
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "bun-test",
        version: "1.0.0",
      },
    });
    this.notify("notifications/initialized");
  }

  async listTools(): Promise<Array<{ name: string; inputSchema?: { type?: string }; outputSchema?: { type?: string } }>> {
    const response = await this.request("tools/list", {});

    return response.result.tools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{
    content: Array<{ text?: string }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  }> {
    const response = await this.request("tools/call", {
      name,
      arguments: args,
    });

    return response.result;
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    this.send({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  private request(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const id = this.nextId++;

    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });
    });
  }

  private send(message: JSONRPCMessage): void {
    this.stdin.write(serializeMessage(message));
  }

  private flushMessages(): void {
    while (true) {
      const newlineIndex = this.buffer.indexOf("\n");

      if (newlineIndex === -1) {
        return;
      }

      const rawMessage = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (rawMessage.length === 0) {
        continue;
      }

      const message = JSON.parse(rawMessage) as JsonRpcResponse | { method: string };

      if ("id" in message && typeof message.id === "number") {
        const resolve = this.pending.get(message.id);

        if (resolve) {
          this.pending.delete(message.id);
          resolve(message);
        }
      }
    }
  }
}

interface JsonRpcResponse {
  id: number;
  result: any;
}
