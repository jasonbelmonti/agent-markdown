# Agent Markdown Agent Resolution Integration

Status: Design draft 0.1

## Objective

Define how agents such as Claude and Codex discover, resolve, validate, and
act on `agent-markdown` documents in a consistent way without relying on
filename folklore or vendor-specific prompt behavior.

This design exists because the core spec defines document semantics, but it
does not by itself guarantee that an agent runtime will notice or honor those
semantics at the right time.

## Context / Constraints

- The current repository already defines a portable document model based on
  `doc_spec`, `doc_kind`, and `doc_profile`.
- The core MVP scope intentionally stops at discovery, parsing, normalization,
  and validation inside this repository.
- Agents like Claude and Codex may encounter Markdown files through search,
  file-open, drag-and-drop, editor context, or host-provided tool results.
- Those agents should not be expected to infer profile meaning from raw
  Markdown alone.
- The integration must remain vendor-neutral even if the first concrete
  adapters are built for a small number of agent hosts.
- Resolution should be cheap enough for common agent workflows and strict
  enough to avoid accidental execution against malformed documents.

## Problem

The core `agent-markdown` design answers "what does this document mean?" but it
does not fully answer "how does an agent know to ask?"

Without an integration layer, agents will usually fall back to one of two bad
behaviors:

- they ignore the profile system and reason from raw Markdown heuristics
- they require one-off prompt instructions for each host and each document kind

That would recreate the exact portability problem the project is trying to
remove.

## Decision Summary

| Topic | Decision |
| --- | --- |
| Canonical integration mechanism | Expose document discovery and resolution through an MCP server or equivalent tool service |
| Canonical trigger policy | Use a thin agent-side skill or host instruction layer to tell agents when to call the resolver |
| Lowest-cost detection step | Sniff Markdown files for `doc_spec` or `doc_profile` before full resolution |
| Fallback detection | If no declaration is found, optionally attempt discovery-hint resolution in `informational` mode |
| Agent input contract | Return a normalized envelope plus validation/conformance details and projected affordances |
| Trust policy | Only treat profile affordances as execution-grade when the document is `semantically_valid` |
| Scope split | Core repo owns parsing rules; integration layer owns runtime exposure and trigger behavior |

## Design Principles

### Declared semantics remain canonical

The MCP integration must preserve the core rule that semantics come from
declared profile identity, not from filename alone.

### Resolver logic is centralized

There should be one canonical runtime path for discovery, profile lookup,
normalization, and validation so agents do not each invent their own parser.

### Trigger behavior is thin and replaceable

The "when should I call the resolver?" layer should stay small. It is agent
behavior policy, not document semantics.

### Trust is conformance-aware

Agents may inspect imperfect documents, but mutation, routing, automation, or
execution should not rely on unresolved or invalid affordances.

### Human-readable Markdown remains primary

The integration should enrich agent behavior without requiring authors to stop
working in normal Markdown files.

## Proposed Architecture

The design has three layers.

### 1. Core document engine

Owned by this repository.

Responsibilities:

- profile registry loading
- candidate discovery
- declaration parsing
- profile resolution
- normalization
- structural validation
- semantic validation
- affordance projection

This layer should be host-agnostic and usable from a CLI, tests, an MCP
server, or future adapters.

### 2. Resolver service layer

Exposed via MCP as the canonical integration surface for agents.

Responsibilities:

- provide tools for discovering and resolving documents
- expose normalized output in a stable transport format
- let hosts request different operating modes such as `informational`,
  `assistive`, or `enforcing`
- return explicit conformance, warnings, and errors
- avoid forcing each agent runtime to read profile files manually

This layer turns the core parser into something agents can use at runtime.

### 3. Agent trigger layer

Implemented as a small skill, host instruction, or built-in runtime behavior.

Responsibilities:

- detect when a Markdown file may be a special document
- decide whether to sniff, resolve, or ignore
- call the MCP resolver before the agent reasons from the file as if it were
  ordinary Markdown
- apply the returned trust rules consistently

This layer should be intentionally dumb. It tells the agent when to ask for
help, not how to interpret profile semantics from scratch.

## Why MCP And A Skill Are Both Needed

An MCP server alone is not sufficient because an agent may still fail to call
it at the right time.

A skill alone is not sufficient because a prompt cannot serve as the canonical
implementation of profile lookup, parsing, and validation.

The split of responsibilities should be:

- MCP server: semantic resolution and normalized outputs
- skill or host instruction: trigger policy and behavioral reminders

That gives us one runtime contract and many possible agent adapters instead of
many incompatible prompt recipes.

## Resolver Tool Surface

The first MCP surface should stay small.

### `agent_markdown.sniff`

Purpose:

- cheaply inspect a Markdown file or Markdown string for likely
  `agent-markdown` declarations

Inputs:

- file path or raw content
- optional repository root

Output:

- whether frontmatter was found
- whether `doc_spec`, `doc_kind`, or `doc_profile` were found
- matching discovery hints if any
- recommendation: `ignore`, `resolve`, or `resolve_informational`

### `agent_markdown.resolve`

Purpose:

- resolve a document through full declaration parsing, profile lookup,
  normalization, validation, and affordance projection

Inputs:

- file path or raw content
- optional repository root
- operating mode: `informational`, `assistive`, or `enforcing`

Output:

- normalized document envelope
- conformance level
- validation errors and warnings
- trust guidance for downstream agent behavior

### `agent_markdown.discover`

Purpose:

- search a repository for candidate `agent-markdown` documents

Inputs:

- repository root
- optional path scope constrained to that repository
- optional profile or kind filters
- optional operating mode

Output:

- discovered files
- declaration summary if cheaply available
- conformance summary if resolved

### `agent_markdown.explain_profile`

Purpose:

- return a concise machine-readable and human-readable summary of a resolved
  profile contract

Inputs:

- `profile_id`

Output:

- metadata rules
- required sections
- validation rules
- affordance semantics

This tool is useful when an agent needs to explain why a document failed
validation or how to author a conformant file.

## Trigger Model

The trigger model should optimize for low false negatives before optimizing for
zero overhead.

### Trigger events

Agents should consider calling the resolver when any of the following happens:

- a Markdown file is opened directly
- a Markdown file is selected from search results
- a user explicitly references a Markdown file in a request
- a tool returns Markdown content that may be treated as instructions, work, or
  context
- the agent is about to summarize, modify, route, or execute work based on a
  Markdown file

### Trigger algorithm

1. If the file is not Markdown, do nothing.
2. Call `agent_markdown.sniff` or equivalent lightweight frontmatter detection.
3. If `doc_spec` or `doc_profile` is present, call `agent_markdown.resolve`.
   `doc_kind` alone is not a sufficient declaration signal.
4. If no declaration is present but profile discovery hints match, optionally
   call `agent_markdown.resolve` in `informational` mode.
5. If neither declaration nor discovery hints match, treat the file as ordinary
   Markdown.

This split avoids full parse cost on every `.md` file while still making
declared documents easy to honor.

## Trust And Behavior Policy

Agents need explicit behavior rules after resolution.

### `candidate`

- okay to inspect casually
- not okay to assume any semantic contract
- do not route or execute from projected semantics

### `recognized`

- okay to summarize with caveats
- do not trust required section semantics yet
- suggest validation if the user wants stronger guarantees

### `structurally_valid`

- okay to reason about document shape and expected sections
- okay to assist with edits that preserve the profile
- do not rely on semantic invariants for automation or workflow gating

### `semantically_valid`

- okay to trust projected affordances such as `role` and `actionability`
- okay to use the document for routing, planning, or execution according to
  host policy
- okay for automation or mutation workflows in `enforcing` mode

The MCP response should include a compact trust block so hosts do not need to
re-derive these rules locally.

## Normalized Response Additions For Agent Runtime

The existing normalized envelope is a strong base, but the integration layer
should add a small runtime-oriented wrapper.

Recommended additions:

- `resolution`:
  - operating mode used
  - whether the result came from declaration, discovery fallback, or explicit
    profile override
- `trust`:
  - `mayReference`
  - `mayPlanFrom`
  - `mayExecuteFrom`
  - `requiresUserConfirmation`
- `guidance`:
  - short machine-readable next-step hints such as
    `show_validation_warning`, `treat_as_plain_markdown`, or
    `safe_for_execution_context`

These are derived values, not new canonical semantics.

## Example Runtime Flow

### Example: declared task document

1. The agent opens `TASK.md`.
2. Trigger layer calls `agent_markdown.sniff`.
3. Sniff sees `doc_spec: agent-markdown/0.1` and
   `doc_profile: task/basic@v1`.
4. Trigger layer calls `agent_markdown.resolve` in `assistive` mode.
5. Resolver returns:
   - normalized sections
   - conformance `semantically_valid`
   - affordances `role=work`, `actionability=execute`
6. Agent may now treat the file as an executable work contract rather than as
   generic notes.

### Example: undeclared but suggestive file

1. The agent opens `PROJECT.md`.
2. Sniff finds no declaration but sees a filename match for a known profile.
3. Trigger layer resolves in `informational` mode.
4. Resolver returns `candidate` or `recognized` with warnings.
5. Agent may mention that the file appears project-like, but should not trust
   it as a validated planning contract.

## Host Integration Modes

Different hosts may integrate at different depths.

### Mode A: prompt-only fallback

- a skill instructs the agent to sniff and resolve when it encounters Markdown
- useful as a bootstrap path
- weakest reliability because invocation remains probabilistic

### Mode B: skill plus MCP

- the recommended near-term model
- skill provides trigger policy
- MCP provides canonical semantics and validation

### Mode C: native host hook plus MCP

- the ideal long-term model
- the host automatically sniffs Markdown file opens and passes results to the
  agent context
- the agent does not need to remember to call the resolver explicitly every
  time

The core design should be written so all three modes can use the same resolver
contract.

## Proposed Skill Guidance

The first skill should be tiny and operational.

Recommended behavior:

- when you open or are asked to reason about a Markdown file, first check
  whether it declares `doc_spec` or `doc_profile`
- if it does, call the `agent-markdown` resolver before interpreting the file
- if the file only matches a known discovery hint, resolve it in
  `informational` mode unless the user explicitly asks for strict validation
- only treat document affordances as execution-grade when conformance is
  `semantically_valid`
- if resolution fails, explain that the file is being treated as ordinary
  Markdown or as a degraded candidate document

The skill should not embed profile definitions or validation rules. Those live
in the resolver-backed core system.

## Repository Impact

This design implies a likely future split:

```text
src/
  discovery/
  parse/
  normalize/
  validate/
  profiles/
packages/ or adapters/
  mcp-server/
skills/
  agent-markdown-resolver/
```

The exact packaging can change. The important boundary is that core semantics
remain reusable and the MCP server stays a transport adapter around that core.

## Materially Verifiable Success Criteria

- [ ] An agent can inspect a Markdown file and determine, via one MCP call
      sequence, whether it is an `agent-markdown` document.
- [ ] A resolved document returns normalized structure, conformance state,
      validation messages, and projected affordances in a stable response
      contract.
- [ ] Two different agents can consume the same resolver output without
      depending on filename-only heuristics.
- [ ] Trigger behavior is specified clearly enough that a thin skill or native
      host hook can implement it without redefining document semantics.
- [ ] Automation and execution policies are gated on conformance level rather
      than on ad hoc prompt judgment.

## Execution Notes

- Build the core parser and validator first; the MCP layer should wrap a real
  library, not duplicate parsing logic.
- Start with `sniff`, `resolve`, and `discover`; add richer tooling only after
  the base flow works.
- Keep the resolver outputs deterministic and compact. Agents need structured
  semantics, not a second novel to read before lunch.
- If the first MCP adapter is built for one host, treat host-specific trigger
  wiring as adapter code, not as a change to the core spec.

## Open Questions

- Should `sniff` be a separate tool, or should `resolve` support a cheap mode
  and make `sniff` unnecessary?
- Should resolver responses include editable patch guidance for repairing
  non-conformant documents, or should that remain an agent-side behavior?
- How much of the trust policy belongs in the normalized envelope versus the
  transport wrapper?
- Does the first shipping integration target Codex, Claude, or both at once?
