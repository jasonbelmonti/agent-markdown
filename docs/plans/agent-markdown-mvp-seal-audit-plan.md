# agent-markdown MVP Seal Audit Plan

Status: Proposed audit plan for sealing the shipped MVP

## Audit Objective

- Artifact under review: the `agent-markdown` repository MVP implementation.
- Audit goal: establish high confidence that the closed-out MVP is internally
  coherent, deterministic at its public boundaries, and safe to hand off
  without reopening feature work.
- Why now: the project has been closed in Linear and needs a final seal pass
  before it becomes stable reference infrastructure instead of active build
  terrain.
- Constraints:
  - Audit against shipped MVP scope only, as defined in `README.md` and
    `docs/spec.md`.
  - Treat future adapters, broader ontology work, and non-MVP extensions as
    explicit non-goals.
  - Prefer evidence from code, examples, and tests over intent inferred from
    repository layout.

## System Snapshot

- Concise architecture summary:
  - `profiles/` defines the normative profile contracts.
  - `src/document-discovery/` and `src/profile-registry/` discover documents
    and load profiles.
  - `src/resolver-core/` orchestrates candidate preparation, profile
    resolution, and runtime trust metadata.
  - `src/markdown-body/`, `src/validation/`, and `src/normalization/` produce
    the canonical normalized envelope.
  - `src/cli/` and `src/mcp-server/` expose the shipped integration surfaces.
- Major runtime surfaces:
  - `bun run validate <path>`
  - `bun run normalize <path>`
  - `bun run mcp`
  - package-root exports from `index.ts`
- Operational profile:
  - no persistence layer, auth boundary, background job system, secrets store,
    or cache layer is present in the MVP
  - primary audit risk comes from contract drift, filesystem/discovery edge
    cases, normalization correctness, and adapter determinism
- Validation baseline:
  - local bootstrap requires dependency install in a fresh worktree
  - after `bun install`, `bun test` currently passes `101/101`
- Key unknowns or missing artifacts:
  - no in-repo CI workflow or release automation artifact is available for
    audit
  - no downstream consumer compatibility fixtures are present beyond local
    tests

## Functional Audit Groups

### Group 1: Normative Contract Assets

- Why this is a coherent review slice:
  the MVP is contract-first, so the spec, profiles, examples, and README define
  the product boundary before code does.
- Priority: high
- Review depth: deep review
- Primary files or directories:
  - `docs/spec.md`
  - `README.md`
  - `profiles/`
  - `examples/`
  - `test/valid-example-documents.test.ts`
  - `test/invalid-example-documents.test.ts`
- Core behaviors to validate:
  - spec, profile, and example alignment
  - required metadata and section rules
  - declared affordances and discovery hints
  - README claims versus implemented MVP scope
- Critical assumptions to test:
  - the three shipped profiles are sufficient and internally consistent
  - examples represent the contract accurately rather than drifting looser or
    stricter than implementation
- Key failure modes or regressions to look for:
  - profile/spec contradictions
  - examples that encode invalid or ambiguous guidance
  - public docs promising behavior the runtime does not ship
- Adjacent groups or dependencies:
  - establishes the ground truth for Groups 2 through 4
- Suggested reviewer type and why:
  - spec-focused reviewer; this group is primarily about semantic coherence

### Group 1 Dispatch Packet

- Mission:
  review the shipped MVP contract for internal consistency and handoff safety.
- In scope:
  normative docs, profile frontmatter, example documents, and tests that pin
  those artifacts.
- Out of scope:
  implementation mechanics unless they expose a contract mismatch.
- Evidence required:
  file references tying spec text, profile fields, and example/test behavior
  together.
- Deliverables:
  prioritized findings, unresolved ambiguities, and recommended doc/profile
  clarifications.

### Group 2: Discovery, Registry, and Resolution Selection

- Why this is a coherent review slice:
  this slice determines whether input is a candidate document, which profile it
  maps to, and how repository-scoped discovery behaves under real path
  conditions.
- Priority: high
- Review depth: deep review
- Primary files or directories:
  - `src/document-discovery/`
  - `src/profile-registry/`
  - `src/resolver-core/context.ts`
  - `src/resolver-core/prepared-document.ts`
  - `src/resolver-core/resolution-plan.ts`
  - `src/resolver-core/discover-documents.ts`
  - `src/resolver-core/sniff-document.ts`
  - `src/resolver-core/explain-profile.ts`
  - `test/document-discovery.test.ts`
  - `test/profile-registry.test.ts`
  - `test/resolver-core.test.ts`
- Core behaviors to validate:
  - declaration parsing boundaries
  - discovery hint matching and normalization
  - profile registry loading and compatibility checks
  - fallback profile selection and filter behavior
  - symlink walk handling and scope containment
- Critical assumptions to test:
  - discovery hints never override declared semantics
  - malformed frontmatter failures are contained
  - relative, absolute, and inline `sourcePath` values stay deterministic
- Key failure modes or regressions to look for:
  - false inclusion or exclusion of candidates
  - incorrect fallback profile resolution
  - null dereference or ambiguity around unresolved declarations
  - path normalization bugs or traversal surprises
- Adjacent groups or dependencies:
  - consumes Group 1 contracts and feeds Group 3 semantics
- Suggested reviewer type and why:
  - filesystem/runtime reviewer; most subtle failures here live in path and
    resolution edge cases

### Group 2 Dispatch Packet

- Mission:
  review the document intake and profile-selection path for correctness,
  determinism, and failure containment.
- In scope:
  discovery hint collection, declaration reading, profile loading and lookup,
  resolution planning, sniff/discover/explain seams, and the direct tests for
  those paths.
- Out of scope:
  normalized validation semantics after a profile is already resolved.
- Evidence required:
  code-path reasoning for candidate detection, declaration extraction,
  resolution choice, and tests that cover or miss each branch.
- Deliverables:
  prioritized findings, unresolved assumptions, and recommended edge-case
  fixture additions if needed.

### Group 3: Parsing, Validation, Normalization, and Trust Semantics

- Why this is a coherent review slice:
  this is the semantic core of the product, where Markdown becomes the
  normalized document and runtime trust guidance.
- Priority: high
- Review depth: deep review
- Primary files or directories:
  - `src/markdown-body/`
  - `src/validation/`
  - `src/normalization/`
  - `src/core-model/`
  - `src/resolver-core/resolve-document.ts`
  - `src/resolver-core/runtime-metadata.ts`
  - `test/markdown-body.test.ts`
  - `test/normalization.test.ts`
  - `test/resolver-core.test.ts`
  - `test/core-model.test.ts`
- Core behaviors to validate:
  - heading extraction and section identity
  - metadata normalization and validation layering
  - structural versus semantic conformance transitions
  - affordance projection and trust/guidance mapping
  - normalized output determinism
- Critical assumptions to test:
  - canonical sections must be top-level in the right cases
  - checklist detection behaves correctly across Markdown edge cases
  - unresolved or incompatible profiles degrade safely
  - assistive versus enforcing modes do not over-grant execution trust
- Key failure modes or regressions to look for:
  - silent affordance escalation
  - false semantic validity
  - list/code-fence parsing leaks
  - metadata filtering that hides or distorts source truth
- Adjacent groups or dependencies:
  - depends on Group 2 intake and defines the payloads consumed by Group 4
- Suggested reviewer type and why:
  - parser/semantics reviewer; the highest-value bugs here are state and
    contract bugs, not style issues

### Group 3 Dispatch Packet

- Mission:
  validate that the canonical normalized document and trust model are correct
  for valid, invalid, undeclared, and incompatible inputs.
- In scope:
  markdown section parsing, validation rules, normalization assembly,
  conformance levels, affordances, and runtime trust/guidance behavior.
- Out of scope:
  transport registration details unless they distort the semantic payload.
- Evidence required:
  line-level reasoning on state transitions, example or fixture support, and
  notes on where the current tests are strong or weak.
- Deliverables:
  prioritized semantic findings, trust-boundary concerns, and follow-up test
  recommendations when gaps are found.

### Group 4: Public Adapters and External Contract Surfaces

- Why this is a coherent review slice:
  the CLI, MCP server, transport contracts, and package exports are the shipped
  entrypoints that consumers actually see.
- Priority: medium-high
- Review depth: targeted review
- Primary files or directories:
  - `src/cli/`
  - `src/mcp-server/`
  - `src/resolver-transport/`
  - `index.ts`
  - `package.json`
  - `test/cli-acceptance.test.ts`
  - `test/validate-cli.test.ts`
  - `test/normalize-cli.test.ts`
  - `test/mcp-server.test.ts`
- Core behaviors to validate:
  - argument handling and exit codes
  - stdout and stderr determinism
  - MCP tool registration and schema parity
  - startup failure behavior and error mapping
  - package-root export stability
  - fresh-worktree install and smoke-test expectations
- Critical assumptions to test:
  - adapters remain transport-thin wrappers over shared core logic
  - public errors stay deterministic and machine-usable
  - bootstrap instructions match reality in a clean checkout
- Key failure modes or regressions to look for:
  - schema drift from core payloads
  - misleading error classes or exit codes
  - startup failures masked by generic messages
  - broken package-root exports or stale docs
- Adjacent groups or dependencies:
  - should only wrap Groups 2 and 3, not reinterpret them
- Suggested reviewer type and why:
  - integration reviewer; the main risk is public contract fidelity

### Group 4 Dispatch Packet

- Mission:
  verify that every shipped public entrypoint preserves the shared resolver
  semantics and exposes deterministic behavior to consumers.
- In scope:
  CLI commands, MCP bootstrap and tool registration, transport contracts,
  package exports, and the smoke-check path from `bun install` to `bun test`.
- Out of scope:
  deeper contract semantics already owned by earlier groups unless an adapter
  changes them.
- Evidence required:
  command or tool traces, error or exit semantics, and tests proving or missing
  the public contract.
- Deliverables:
  prioritized adapter findings, release-readiness risks, and missing smoke
  checks for external consumers.

## Cross-Cutting Review Tracks

- Determinism and contract parity:
  validate that spec, profiles, examples, tests, CLI JSON, and MCP structured
  responses describe the same truth.
- Filesystem and bootstrap portability:
  validate relative versus absolute path handling, symlink behavior, repo-root
  assumptions, and fresh-worktree reproducibility.
- Test strategy and regression detection:
  validate whether the current suite targets the highest-risk promises or only
  the most convenient ones.

## Recommended Review Order

1. Group 1: Normative Contract Assets
2. Group 2: Discovery, Registry, and Resolution Selection
3. Group 3: Parsing, Validation, Normalization, and Trust Semantics
4. Group 4: Public Adapters and External Contract Surfaces
5. Cross-cutting reconciliation pass across all groups

## Coverage Gaps

- No in-repo CI workflow or release automation artifact was available to audit.
- No downstream consumer compatibility fixtures or external MCP client
  integration traces were present beyond local tests.
- Scale and performance behavior for very large repositories or large Markdown
  corpora is not materially exercised by the current suite.
- If dispatch begins later, reviewers should load only the relevant files listed
  in their packet rather than re-survey the whole repository.
