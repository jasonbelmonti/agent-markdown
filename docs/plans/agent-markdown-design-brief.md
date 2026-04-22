# Agent Markdown Design Brief

Status: Proposed foundation for this repository

## Objective

Define the founding design decisions for this repository, which generalizes
special agent-readable Markdown files into a formal profile system.

This brief exists to settle the core contract before implementation begins, so
the Bun + TypeScript codebase is built on explicit design decisions rather than
on implicit prompt-era habits.

## Context / Constraints

- This repository is the dedicated home for the agent-markdown work.
- The implementation should prefer Bun and TypeScript.
- The system must support special document kinds such as `TASK.md`,
  `PROJECT.md`, and `BRIEF.md` without making filenames the only source of
  meaning.
- The design should stay small, versioned, and portable across tools and model
  providers.
- The system should be useful to agents like Claude and Codex, but it should
  not depend on one vendor's prompt format or one editor's plugin model.

## Decision Summary

| Topic | Decision |
| --- | --- |
| Repository name | `agent-markdown` |
| Meta-spec name and versioning | `agent-markdown/0.1` in `doc_spec`; profiles versioned separately as `<kind>/<name>@v<major>` |
| Profile definition format | Markdown profile documents with constrained YAML frontmatter as the canonical machine-readable contract |
| Initial MVP profile set | `task/basic@v1`, `project/basic@v1`, `brief/basic@v1` |
| Conformance strictness model | Conformance states plus operating modes: `candidate`, `recognized`, `structurally_valid`, `semantically_valid`; `informational`, `assistive`, `enforcing` |
| Normalized output contract | A single normalized document envelope with `source`, `declaration`, `profile`, `metadata`, `body`, `validation`, `affordances`, and `extensions` |

## Repository Name

### Decision

Use `agent-markdown` as the repository name.

### Rationale

- It is broad enough to hold the meta-spec, profile definitions, parser,
  validator, examples, and future packages.
- It keeps the project identity focused on the core idea rather than one
  particular artifact such as `TASK.md`.
- It leaves room for future package organization such as
  `@agent-markdown/core`, `@agent-markdown/profiles`, or
  `@agent-markdown/cli` if publishing ever becomes relevant.

### Rejected alternatives

- `agent-markdown-profiles`: clear, but slightly too implementation-shaped for
  the umbrella repo.
- `task-md`: too narrow and overfit to the original inspiration.
- `special-markdown`: descriptive, but underspecified about the agent-facing
  purpose.

## Meta-Spec Name and Versioning Convention

### Decision

Use `agent-markdown/0.1` as the initial meta-spec identifier, stored in
instance documents under `doc_spec`.

Use the following canonical declaration fields in instance documents:

```yaml
---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Add dependency graph validation
---
```

Versioning rules:

- The meta-spec uses `<name>/<major>.<minor>`.
- Increment `minor` for additive or clarifying changes that preserve existing
  instance validity and parser expectations.
- Increment `major` for incompatible changes to required fields, interpretation
  rules, or normalized output semantics.
- Profiles use `<kind>/<name>@v<major>`.
- Increment a profile's major version only when the contract changes in a way
  that can invalidate or reinterpret existing documents.

### Rationale

- The meta-spec and profile layers evolve at different speeds and should not
  share a single version number.
- A major-only profile identifier keeps instance documents stable and readable.
- `doc_spec`, `doc_kind`, and `doc_profile` are explicit enough to be portable
  and simple enough for agents to reason about directly.

### Notes

- Minor editorial fixes to a profile document do not require a new
  `doc_profile` identifier unless they change the normative contract.
- The first implementation should support explicit compatibility tables rather
  than attempting dynamic inheritance across spec versions.

## Profile Definition Format

### Decision

Define profiles as Markdown documents with constrained YAML frontmatter.

Frontmatter is the canonical machine-readable contract.
The Markdown body carries rationale, examples, author guidance, and
non-normative explanation.

Recommended profile path shape in this repository:

```text
profiles/
  task/
    basic.profile.md
  project/
    basic.profile.md
  brief/
    basic.profile.md
```

Recommended profile frontmatter shape:

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

### Rationale

- This keeps the system self-hosting: special Markdown documents are defined
  using special Markdown documents.
- Frontmatter provides a clean machine-readable surface for loaders and
  validators.
- The body remains useful for humans and agents who need explanatory context,
  examples, and edge-case guidance.
- Markdown profile docs are easy to diff, review, and discuss in the same
  workflow as the instance documents they govern.

### Constraint

For the MVP, validation rules inside profile documents should stay declarative.

Custom code hooks for profile-specific validation may be added later, but they
should not be required to define or consume the initial profile set.

## Markdown Engine Baseline

### Decision

Treat instance-document bodies as standard Markdown rather than as a
repo-specific parsing dialect.

The intended baseline is:

- GitHub Flavored Markdown for instance-document body structure
- task-list semantics are the GFM feature currently used directly by the MVP
  task profile, but the parser surface is not limited to task lists
- raw HTML interpreted according to the chosen Markdown parser rather than
  hidden by custom repository-local rules

The preferred parser substrate for the next engine pass is:

- `mdast-util-from-markdown`
- `micromark-extension-gfm`
- `mdast-util-gfm`

Supporting traversal and text helpers may be added as needed, but the parser
decision should stay anchored to the mdast/micromark ecosystem rather than a
generic HTML parser.

### Rationale

- This keeps `agent-markdown` aligned with well-adopted Markdown behavior
  instead of competing with it.
- The parser layer should own Markdown structure. Repository code should own
  only `agent-markdown` semantics such as required sections, declaration
  fields, and profile-governed checklist requirements.
- Custom HTML-hiding rules create a fragile seam between the Markdown engine
  and profile validation. The meta-spec should not promise those semantics
  unless it is willing to carry the long-term implementation burden.

### Constraint

Profiles may validate parsed structure, but they should not silently narrow or
reinterpret the underlying Markdown parsing model.

If a future profile wants to forbid or reinterpret otherwise valid Markdown
constructs, that narrower surface must be:

- declared explicitly in the profile contract
- backed by validator support that actually enforces the restriction
- treated as an intentional profile-level burden rather than as an invisible
  property of the base meta-spec

## Initial MVP Profile Set

### Decision

Start this repository with exactly three first-class profiles:

- `task/basic@v1`
- `project/basic@v1`
- `brief/basic@v1`

### Profile roles

`task/basic@v1`

- Purpose: define a concrete unit of work.
- Expected agent affordance: executable work contract.
- Required body structure:
  - `Objective`
  - `Context / Constraints`
  - `Materially verifiable success criteria`
  - `Execution notes`

`project/basic@v1`

- Purpose: define a durable coordination context across multiple tasks.
- Expected agent affordance: planning and routing context.
- Required body structure:
  - `Objective`
  - `Context / Constraints`
  - `Scope / Non-goals`
  - `Success measures`
  - `Execution notes`

`brief/basic@v1`

- Purpose: capture situational context, framing, or a recommended direction.
- Expected agent affordance: context input for planning and execution.
- Required body structure:
  - `Objective`
  - `Context / Constraints`
  - `Recommendation`
  - `Open questions`

### Rationale

- `task` proves executable work semantics.
- `project` proves coordination and scope semantics.
- `brief` proves context and recommendation semantics.
- This is enough variation to test whether the system is genuinely general,
  without turning the MVP into an ontology museum.

### Explicit non-MVP profiles

Do not include these in the first pass:

- `agent_manual`
- `skill`
- `decision`
- `policy`

Those may follow after the base system proves itself on the initial three.

## Conformance Strictness Model

### Decision

Separate conformance state from operating mode.

Conformance states are descriptive facts about a document.
Operating modes determine how strictly tools and agents should behave.

### Conformance states

`candidate`

- The file matched a discovery hint such as filename or glob.
- No trusted semantic interpretation should be assumed yet.

`recognized`

- The file declares supported `doc_spec`, `doc_kind`, and `doc_profile`.
- The declared profile can be resolved in the registry.

`structurally_valid`

- The document passes structural checks for its profile.
- Frontmatter shape, required fields, and required section structure are valid.

`semantically_valid`

- The document passes profile-level semantic rules.
- Normative affordances may be trusted for routing, planning, or execution.

### Operating modes

`informational`

- Best-effort parsing is allowed.
- Candidate and partially valid documents may still be surfaced for inspection.

`assistive`

- Tools may summarize or reason over recognized documents.
- Missing structural or semantic guarantees must surface as warnings.
- Profile affordances should be treated as degraded unless the document is
  `semantically_valid`.

`enforcing`

- Automation, mutation, routing, and workflow gating require
  `semantically_valid` documents.
- Non-conformant documents are blocking errors, not advisory warnings.

### Rationale

- Agents often need to read imperfect documents, but they should not execute
  against unreliable contracts.
- This model avoids a false binary between "parse nothing" and "trust
  everything."
- It gives downstream tools a consistent way to degrade behavior without
  inventing local heuristics.

## Normalized Output Contract

### Decision

Use a single normalized envelope for all parsed documents, regardless of
profile.

Recommended TypeScript shape:

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

### Contract rules

- `source` preserves enough raw information for round-trip safety and debugging.
- `declaration` captures the canonical semantic declaration from the instance
  document.
- `profile` records profile resolution status separately from validity.
- `metadata` contains normalized profile-defined document metadata.
- `body.sections` makes heading structure first-class instead of flattening the
  body into a single opaque string.
- `validation` must distinguish errors from warnings and expose the current
  conformance level directly.
- `affordances` contains projected semantics for agents and tools.
- `extensions` is the escape hatch for implementation-specific data that should
  not pollute the normalized core.

### Rationale

- A single envelope reduces downstream branching by profile.
- Raw and normalized data need to coexist; round-trip safety and agent-friendly
  structure are different concerns.
- Headings are semantically important in this system and should not disappear
  after parsing.

## Repository Scope

This repository should be responsible for four things:

1. Defining the `agent-markdown` meta-spec
2. Defining the initial profile registry
3. Implementing discovery, parsing, normalization, and validation
4. Providing valid and invalid example documents for the MVP profiles

It should not attempt in v1 to provide:

- a hosted service
- a UI or editor plugin
- workflow automation orchestration
- a universal project-management model

## Materially Verifiable Success Criteria

- [ ] The repository can be scaffolded without reopening the six settled
      decisions in this brief.
- [ ] A parser implementation can resolve `doc_spec` and `doc_profile` from an
      instance document using only the contracts defined here.
- [ ] The MVP profile set is concrete enough to produce valid and invalid sample
      documents without inventing new policy.
- [ ] The conformance model is explicit enough that a tool can decide whether to
      inspect, assist with, or gate on a document.
- [ ] The normalized output contract is specific enough to implement typed
      Bun/TypeScript parsing code directly.

## Execution Notes

- The first implementation pass should remain docs-first and parser-first.
- Do not start with inheritance, plugin systems, or code-defined profile logic.
- The repo layout can stay simple:

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
test/
```

- The first CLI surface only needs enough to prove the contract, for example:
  - `bun run validate examples/valid/task.md`
  - `bun run normalize examples/valid/task.md`
- If any of the six settled decisions need to change during implementation, the
  design brief should be updated before the code is treated as canonical.
