# agent-markdown

`agent-markdown` is a Bun-native TypeScript repository for declaring, resolving,
validating, and normalizing agent-readable Markdown documents.

The current MVP ships three concrete document profiles, narrow CLI proof
commands, and a resolver-first MCP server surface. It stays intentionally
small: the repo owns document semantics and transport-thin runtime adapters, not
host-specific automation behavior.

## Shipped MVP surface

- Meta-spec: `agent-markdown/0.1`
- Supported profiles:
  - `task/basic@v1`
  - `project/basic@v1`
  - `brief/basic@v1`
- CLI commands:
  - `bun run validate <path>`
  - `bun run normalize <path>`
- MCP entrypoint:
  - `bun run mcp`
- Programmatic exports from [`index.ts`](./index.ts):
  - core model, profile registry, normalization
  - resolver core
  - document discovery and markdown-body helpers
  - MCP bootstrap helpers
  - resolver transport types

## Quickstart

Install dependencies:

```bash
bun install
```

Run the test suite:

```bash
bun test
```

Validate a shipped example document:

```bash
bun run validate examples/valid/task/basic.task.md
```

Normalize the same document into the canonical JSON envelope:

```bash
bun run normalize examples/valid/task/basic.task.md
```

Start the MCP server over stdio:

```bash
bun run mcp
```

Start the MCP server against an explicit repository root:

```bash
bun run mcp --repo-root /absolute/path/to/agent-markdown
```

Run the high-signal CLI acceptance lane only:

```bash
bun run acceptance:cli
```

`bun run index.ts` is not the primary user entrypoint. The package root mainly
re-exports library surfaces for tests and future consumers.

## What The CLI Does

`validate` resolves a Markdown document by path, loads the declared profile, and
prints deterministic validation JSON. Exit code `0` means semantically valid,
`1` means the document resolved but is not fully valid, and `2` is reserved for
unexpected loader failures such as malformed frontmatter.

`normalize` resolves the same path through the full pipeline and prints the
canonical normalized JSON envelope, including declaration data, metadata, body
sections, validation state, and projected affordances.

Both commands are proven against the shipped example corpus under
[`examples/`](./examples) and the CLI tests under [`test/`](./test).

## MCP Surface

The stdio MCP server wraps the same resolver core used by the CLI and exposes
four tools:

- `agent_markdown.sniff`
- `agent_markdown.resolve`
- `agent_markdown.discover`
- `agent_markdown.explain_profile`

The MCP layer is intentionally thin. It exposes canonical discovery and
resolution behavior to agent runtimes without moving document semantics into
host-specific prompts.

## Repository Layout

```text
profiles/   Versioned Markdown profile contracts
examples/   Valid and invalid example documents
src/cli/    validate and normalize command entrypoints
src/resolver-core/ Core discovery and resolution pipeline
src/mcp-server/ MCP bootstrap and tool registration
src/resolver-transport/ Shared resolver transport contracts
src/profile-registry/ Profile loading and lookup
src/validation/ Structural and semantic validation
test/       CLI, resolver, MCP, and fixture-backed verification
docs/       Spec and design documents
```

The most relevant shipped examples are:

- [`examples/valid/task/basic.task.md`](./examples/valid/task/basic.task.md)
- [`examples/valid/project/basic.project.md`](./examples/valid/project/basic.project.md)
- [`examples/valid/brief/basic.brief.md`](./examples/valid/brief/basic.brief.md)

The three initial profile contracts live under:

- [`profiles/task/basic.profile.md`](./profiles/task/basic.profile.md)
- [`profiles/project/basic.profile.md`](./profiles/project/basic.profile.md)
- [`profiles/brief/basic.profile.md`](./profiles/brief/basic.profile.md)

## Scope Boundaries

This repository currently includes:

- explicit declaration parsing via `doc_spec`, `doc_kind`, and `doc_profile`
- profile-backed discovery hints, validation, and affordance projection
- deterministic normalized document envelopes
- CLI proof commands for `validate` and `normalize`
- a resolver-first MCP server for agent runtimes

This repository intentionally does not include:

- profile inheritance
- profile-specific executable validation hooks
- plugin systems
- a hosted service
- UI or editor integrations
- workflow orchestration
- a larger project-management ontology
- host-specific Codex, Claude, or other trigger adapters

Those host adapters may exist later, but they are outside the MVP and are not
implemented in this repository today.

## Specs And Design Notes

The normative MVP contract lives in [`docs/spec.md`](./docs/spec.md).

Supporting design documents live under [`docs/plans/`](./docs/plans):

- [`docs/plans/agent-markdown-design-brief.md`](./docs/plans/agent-markdown-design-brief.md)
- [`docs/plans/agent-markdown-profile-system.md`](./docs/plans/agent-markdown-profile-system.md)
- [`docs/plans/agent-markdown-agent-resolution-integration.md`](./docs/plans/agent-markdown-agent-resolution-integration.md)
