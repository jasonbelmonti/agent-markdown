# agent-markdown MVP Specification

Status: Normative MVP specification

This document is the implementation-facing contract for the first
`agent-markdown` release. It consolidates the settled decisions from the design
briefs into one normative reference for repository structure, profile shape,
document parsing, validation, and normalization.

The design briefs remain useful rationale documents. This file is the source of
truth for the MVP implementation.

## 1. Scope

The MVP standardizes a small, portable system for agent-readable Markdown
documents.

The system must:

- declare document semantics explicitly
- keep filenames as discovery hints rather than canonical truth
- use Markdown as the primary authoring format
- support parsing into a normalized structured model
- support validation of both frontmatter and body structure
- remain small, versioned, and provider-portable

The MVP intentionally covers only:

- the `agent-markdown/0.1` meta-spec
- Markdown-defined profile documents with constrained YAML frontmatter
- GitHub Flavored Markdown body parsing
- three first-class profiles:
  - `task/basic@v1`
  - `project/basic@v1`
  - `brief/basic@v1`
- discovery, parsing, normalization, and validation
- narrow CLI proof commands for `validate` and `normalize`
- a resolver-first MCP server surface for runtime integrations
- a valid and invalid example corpus

The MVP does not include:

- profile inheritance
- custom profile-specific code hooks
- plugin systems
- a hosted service
- UI or editor integration
- workflow automation orchestration
- a broader project-management ontology
- host-specific trigger adapters or prompts

## 2. Canonical Declaration Model

Each instance document must declare its governing contract in frontmatter.

Required declaration fields:

- `doc_spec`
- `doc_kind`
- `doc_profile`
- `title`

Canonical example:

```yaml
---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Add dependency graph validation
---
```

Declaration rules:

- `doc_spec` identifies the supported meta-spec version.
- `doc_kind` identifies the broad semantic category.
- `doc_profile` identifies the specific versioned profile contract.
- `title` is required document metadata in the MVP.
- Filename, path, and glob matches may assist discovery but must never override
  the declared semantic contract.

## 3. Versioning

Versioning is split across the meta-spec and profile layers.

Meta-spec rules:

- Meta-spec identifiers use `<name>/<major>.<minor>`.
- The MVP meta-spec identifier is `agent-markdown/0.1`.
- Increment `minor` for additive or clarifying changes that preserve existing
  validity and parser expectations.
- Increment `major` for incompatible changes to required fields,
  interpretation rules, or normalized output semantics.

Profile rules:

- Profile identifiers use `<kind>/<name>@v<major>`.
- The MVP supports only `task/basic@v1`, `project/basic@v1`, and
  `brief/basic@v1`.
- Increment a profile major version only when the profile contract changes in a
  way that can invalidate or reinterpret existing documents.
- Editorial clarification alone does not require a new profile identifier.

The MVP should support explicit compatibility checks between `doc_spec` and
profile documents. It should not implement inheritance or dynamic compatibility
resolution.

## 4. Profile Definition Format

Profiles are Markdown documents with constrained YAML frontmatter.

Frontmatter is the canonical machine-readable contract. The Markdown body may
contain rationale, examples, authoring guidance, and other non-normative text.

Expected repository layout:

```text
profiles/
  task/
    basic.profile.md
  project/
    basic.profile.md
  brief/
    basic.profile.md
```

Each profile document must define, at minimum:

- `profile_id`
- supported `doc_spec`
- `doc_kind`
- discovery hints
- required and optional metadata
- required and optional body sections
- declarative validation rules
- projected affordances for agents and tools

Representative frontmatter shape:

```yaml
---
profile_id: task/basic@v1
doc_spec: agent-markdown/0.1
doc_kind: task
title: Basic task profile
discovery:
  filenames:
    - TASK.md
  globs:
    - "**/*.task.md"
metadata:
  required:
    - title
  optional:
    - status
    - owners
body:
  required_sections:
    - Objective
    - Context / Constraints
    - Materially verifiable success criteria
    - Execution notes
  optional_sections:
    - Notes
validation:
  require_checklist_in_success_criteria: true
affordances:
  role: work
  actionability: execute
---
```

Validation rules defined in profile documents must remain declarative in the
MVP. The implementation must not require profile-specific executable hooks.

## 5. MVP Profiles

The MVP profile set is fixed at three profiles.

### `task/basic@v1`

Purpose:

- defines a concrete unit of work

Expected affordance:

- role: `work`
- actionability: `execute`

Required body sections:

- `Objective`
- `Context / Constraints`
- `Materially verifiable success criteria`
- `Execution notes`

Profile-specific note:

- success criteria must be materially verifiable
- the MVP validator should support a declarative rule requiring checklist items
  in the success-criteria section

### `project/basic@v1`

Purpose:

- defines a durable coordination context across multiple tasks

Expected affordance:

- role: `coordination`
- actionability: `plan`

Required body sections:

- `Objective`
- `Context / Constraints`
- `Scope / Non-goals`
- `Success measures`
- `Execution notes`

### `brief/basic@v1`

Purpose:

- captures situational context, framing, or a recommended direction

Expected affordance:

- role: `context`
- actionability: `reference`

Required body sections:

- `Objective`
- `Context / Constraints`
- `Recommendation`
- `Open questions`

Non-MVP profile kinds include `agent_manual`, `skill`, `decision`, and
`policy`.

## 6. Discovery And Resolution

Documents must be processed in stages.

### Stage 1: Candidate discovery

Tools may scan repositories for Markdown files that match known discovery
patterns such as preferred filenames, globs, or explicit paths.

Repository-scoped discovery must remain bounded to the configured `repoRoot`.
Explicit scope paths must resolve within that repository root, and symlink
targets that escape the repository must not be traversed.

At this stage the document is only a candidate.

### Stage 2: Declaration read

Tools read lightweight metadata to determine whether the document declares
supported values for:

- `doc_spec`
- `doc_kind`
- `doc_profile`

`doc_spec` or `doc_profile` is sufficient to trigger declaration-first
resolution. `doc_kind` alone is not.

### Stage 3: Profile lookup

Tools resolve the declared profile through the profile registry.

When discovery results are filtered by kind or profile, declared values remain
authoritative. Discovery hints may assist fallback matching for undeclared
documents, but they must not override declared semantics.

If profile resolution fails, the document may still be surfaced as a discovered
candidate, but it must not be treated as semantically valid.

### Stage 4: Full parse and normalization

Tools parse the Markdown body and metadata according to the resolved profile and
produce the normalized envelope.

Markdown body parsing baseline:

- instance document bodies use GitHub Flavored Markdown as the normative
  parsing baseline
- task-list structure is the GFM feature that is currently semantically
  significant for the `task/basic@v1` contract, but the accepted parser surface
  is not limited to task-list syntax alone
- raw HTML remains part of the accepted Markdown surface and is interpreted
  according to the chosen GFM parser rather than repo-local
  hidden-content rules
- structural and semantic validation operate on the parsed Markdown structure;
  they must not silently override the underlying parser's interpretation of
  headings, lists, task items, or raw HTML blocks
- profile documents may add validation rules over parsed structure, but they
  must not redefine the baseline Markdown parsing model without explicitly
  declaring and enforcing that narrower contract

Temporary implementation note:

- the repository is still migrating to this parsing baseline under `BEL-848`
  through `BEL-852`
- current runtime behavior and normalization tests may still reflect the older
  repo-local HTML-hidden-content rules explored during the Group 3 remediation
  cycle
- until that migration lands, treat the current implementation and tests as the
  authoritative description of shipped parser behavior where they differ from
  this target baseline

### Stage 5: Validation and affordance projection

Tools apply structural and semantic validation and then project affordances that
downstream agents or tools may rely on.

## 7. Conformance Model

Conformance state and operating mode are separate concepts.

Conformance states describe what is true about a document. Operating modes
describe how strictly the system should behave.

### Conformance states

`candidate`

- the file matched a discovery hint
- no trusted semantic interpretation may be assumed

`recognized`

- the file declares supported `doc_spec`, `doc_kind`, and `doc_profile`
- the declared profile resolves in the registry

`structurally_valid`

- frontmatter shape is valid
- required fields are present
- required body structure is valid

`semantically_valid`

- profile-level semantic rules also pass
- projected affordances may be trusted for routing, planning, or execution

### Operating modes

`informational`

- best-effort parsing is allowed
- candidate and partially valid documents may still be surfaced

`assistive`

- recognized documents may be summarized or reasoned over
- missing guarantees must surface as warnings
- affordances are degraded unless the document is `semantically_valid`

`enforcing`

- automation, mutation, routing, or workflow gating requires
  `semantically_valid`
- non-conformant documents are blocking errors

## 8. Normalized Output Contract

All parsed documents must normalize into one shared envelope shape.

```ts
type ConformanceLevel =
  | "candidate"
  | "recognized"
  | "structurally_valid"
  | "semantically_valid";

type OperatingMode = "informational" | "assistive" | "enforcing";

interface NormalizedSection {
  id: string;
  heading: string;
  headingPath: string[];
  level: number;
  order: number;
  rawMarkdown: string;
  contentMarkdown: string;
}

interface ValidationMessage {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
}

interface NormalizedDocument {
  source: {
    path: string;
    contentHash: string;
    discoveryMatches: string[];
    rawFrontmatter: Record<string, unknown>;
    rawBodyMarkdown: string;
  };
  declaration: {
    docSpec: string | null;
    docKind: string | null;
    docProfile: string | null;
    title: string | null;
  };
  profile: {
    resolved: boolean;
    profileId: string | null;
    profilePath: string | null;
  };
  metadata: Record<string, unknown>;
  body: {
    sections: NormalizedSection[];
  };
  validation: {
    conformance: ConformanceLevel;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
  };
  affordances: {
    role: "work" | "coordination" | "context" | "policy" | "capability" | null;
    actionability: "reference" | "plan" | "execute" | null;
    normativeSections: string[];
  };
  extensions: Record<string, unknown>;
}
```

Contract rules:

- `source` preserves debugging and round-trip-oriented source data
- `declaration` captures the canonical semantic declaration
- `profile` records profile resolution independently from validity
- `metadata` stores normalized document metadata defined by the profile
- `body.sections` makes heading structure first-class
- `validation` separates errors from warnings and exposes conformance directly
- `affordances` projects the semantics agents and tools may use
- `extensions` is the escape hatch for implementation-specific data

## 9. Repository Responsibilities

For the MVP, this repository is responsible for:

1. defining the `agent-markdown` meta-spec
2. defining the initial profile registry
3. implementing discovery, parsing, normalization, and validation
4. exposing the shared resolver semantics through a thin MCP server surface
5. providing valid and invalid example documents

The first implementation pass should remain docs-first and parser-first.

Recommended implementation layout:

```text
docs/
  spec.md
profiles/
  task/basic.profile.md
  project/basic.profile.md
  brief/basic.profile.md
examples/
  valid/
  invalid/
src/
  discovery/
  parse/
  normalize/
  validate/
  mcp-server/
test/
```

## 10. CLI Proof Surface

The MVP CLI is intentionally narrow.

Required proof commands:

- `bun run validate <path>`
- `bun run normalize <path>`

The CLI exists to prove the core contract. It must not become a broader product
surface in the MVP.

## 11. MCP Integration Surface

The MVP also includes a resolver-first MCP server surface for runtime
integrations.

Required entrypoint:

- `bun run mcp`

Required tool surface:

- `agent_markdown.sniff`
- `agent_markdown.resolve`
- `agent_markdown.discover`
- `agent_markdown.explain_profile`

Contract rules:

- the MCP layer must stay thin and reuse the shared resolver semantics
- transport code must not reinterpret document meaning independently from the
  shared discovery, profile resolution, normalization, and validation logic
- host-specific trigger adapters or prompts remain outside the MVP

## 12. Acceptance Criteria

The MVP is acceptable only when all of the following are true:

- the repository can be scaffolded without reopening the six settled design
  decisions
- a parser can resolve `doc_spec` and `doc_profile` using only the declared
  contracts
- the MVP profile set is concrete enough to produce valid and invalid sample
  documents without inventing new policy
- the conformance model is explicit enough for a tool to decide whether to
  inspect, assist with, or gate on a document
- the shared resolver behavior can be exposed over the MCP server surface
  without redefining the underlying document contract in transport-specific code
- the normalized output contract is specific enough to implement typed
  Bun/TypeScript parsing code directly

If implementation requires changing any settled decision above, the design
briefs must be updated before the new behavior is treated as canonical.
