# Group 3 HTML Block Remediation Plan

Status: Historical remediation note; superseded as an active parser-contract
execution source by the Markdown engine baseline adopted in `BEL-847`

## Supersession note

This document captures the parser-contract direction that was developed during
the PR `#27` / PR `#28` remediation loop.

It is preserved as historical context for:

- the specific HTML-wrapper failure mode that drove the remediation
- the shape of the shared-helper contract explored during that work
- the audit history tracked under `BEL-816`

It is no longer the active execution source for parser semantics.

Current authoritative direction for future parser work now lives in:

- `docs/spec.md` for the normative Markdown parsing baseline
- `docs/plans/group-3-parser-library-migration.md` for the BEL-847 parser
  selection and migration direction

Where this document conflicts with those newer sources, treat this document as
historical reference rather than current contract.

## Objective

Define one canonical HTML block contract for Group 3 remediation so heading
parsing and checklist validation consume the same structural semantics, and the
final fix can land through a clean replacement PR that supersedes `#27`.

## Context / Constraints

- This plan is a follow-up to Group 3 audit findings and the review churn on
  PR `#27`.
- This note reflects the repo-local HTML-contract direction that was under
  consideration before the Markdown engine reboot decision in `BEL-847`.
- The root problem is not one missing edge case; it is that HTML block
  semantics were being patched per reproducer instead of specified once as a
  shared parser contract.
- Scope is limited to shipped MVP parsing, validation, normalization, and
  trust semantics.
- Do not expand the public runtime API, CLI contract, MCP surface, or profile
  system in this pass.
- Do not attempt to implement a full CommonMark HTML parser. The goal is a
  small, explicit contract that covers the shipped MVP behavior and the
  validated regressions.
- Treat PR `#27` as reference and scratch history. The intended merge vehicle
  is a replacement PR from `main` after the contract is coherent.
- Linear tracking for this work lives under `BEL-816` with child issues
  `BEL-838` through `BEL-841`.
- That remediation stack is now historical context; future parser work should
  follow the newer CommonMark/GFM baseline instead of reopening this document
  as the active contract.

## Materially verifiable success criteria

- [ ] This document defines the target HTML block categories, state-transition
      rules, and list-context interaction rules for Group 3 remediation.
- [ ] Direct helper-level tests exist for generic wrappers, allowlisted
      wrappers with blank interior lines, inline opener forms, single-line raw
      tags, void tags, and standalone closing tags.
- [ ] Heading extraction and checklist validation both consume the shared HTML
      contract rather than re-deriving HTML behavior independently.
- [ ] The replacement PR from `main` supersedes PR `#27` with a coherent diff
      and a green `bun test` run.

## Execution notes

Work should land in this order:

1. Write this design note and use it as the execution source.
2. Add direct contract tests for the shared HTML helper.
3. Refactor `src/markdown-body/html-blocks.ts` around explicit structural
   categories and deterministic state transitions.
4. Rewire downstream consumers to the shared HTML contract.
5. Open a clean replacement PR from `main`, then close PR `#27` after the new
   review vehicle exists.

The implementation should prefer one small, explicit state machine over more
regular-expression branching distributed across multiple consumers.

## Root Cause

PR `#27` introduced a shared HTML helper and then reused it inside heading
parsing and checklist validation, but the contract was incomplete.

The missing pieces all lived at the same seam:

- which lines start persistent HTML block state
- which lines are only structural single-line blockers
- which lines keep an HTML block open
- which lines close it
- how open HTML blocks interact with Markdown list-context tracking

Because those rules were not written down in one place, each follow-up patch
closed one reproducer while leaving a neighboring case unspecified. That
produced repeated review cycles around inline openers, void tags, closing tags,
blank lines, outdented closes, generic wrappers, and single-line raw tags.

## Non-goals

- No new document profiles, sections, affordances, or trust levels.
- No expansion of README or spec scope beyond what is already shipped.
- No generic markdown-parser rewrite outside the HTML-block seam.
- No attempt to support every possible inline HTML construct. This pass only
  needs the structural cases that affect section parsing and checklist
  validation.

## Target HTML Block Contract

Historical note:

The remaining sections in this document describe the repo-local HTML-block
contract that was proposed during the PR `#27` / PR `#28` remediation cycle.

They are preserved to explain that earlier direction, not to define the active
Markdown baseline for future implementation work.

The shared helper in `src/markdown-body/html-blocks.ts` should model HTML
structure using explicit categories.

### Category 1: Persistent terminator-based blocks

These lines start a block that stays open until a terminator is observed:

- HTML comments: `<!--`
- CDATA sections: `<![CDATA[`
- declarations: `<!DOCTYPE ...>` and related declaration forms
- processing instructions: `<?...?>`

Behavior:

- These blocks hide headings and checklist-looking lines while open.
- Blank interior lines do not close the block.
- The block closes only when its category-specific terminator appears.

### Category 2: Persistent matching-tag blocks

These lines start a block that stays open until a matching closing tag is
observed:

- raw HTML tags: `<pre>`, `<script>`, `<style>`, `<textarea>`
- wrapper tags such as `<details>`
- generic wrappers such as `<custom-tag>`
- opener lines may include trailing inline content such as
  `<details><summary>Summary</summary>`

Behavior:

- These blocks hide headings and checklist-looking lines while open.
- Blank interior lines do not close the block.
- The block closes only when a matching closing tag is consumed.
- If an opener line also contains its matching closing tag on the same line,
  it must behave as a single-line structural HTML line instead of leaving the
  parser stuck inside HTML.

### Category 3: Single-line structural HTML lines

These lines affect paragraph and list continuation but do not open persistent
HTML state:

- standalone closing tags such as `</details>`
- void tags such as `<hr>`
- self-closing tags
- single-line raw-tag wrappers where opener and closer both occur on the same
  line

Behavior:

- These lines break lazy paragraph continuation and can collapse stale list
  context.
- They do not remain open on later lines.
- They do not hide later visible headings or checklist items after the current
  line has been consumed.

### Indentation gating

The helper must stay indentation-aware so callers can reuse the same contract
at root level and inside list containers.

Rules:

- The caller supplies the maximum indentation that is structurally valid for
  the current context.
- Lines outside the permitted indentation must not start HTML block state.
- The helper owns HTML classification; callers own context-specific decisions
  about when that structural line should collapse list state.

## Consumer Rules

### Heading extraction

`src/markdown-body/collect-heading-boundaries.ts` should:

- use the shared helper only at root-level section-parsing indentation
- ignore ATX headings while any persistent HTML block state is open
- resume heading parsing immediately after single-line structural HTML lines or
  after a persistent HTML block closes

Heading parsing should not contain its own HTML taxonomy.

### Checklist validation

`src/validation/contains-markdown-checklist-item.ts` should:

- use the shared helper for all HTML structural recognition
- treat structural HTML lines as paragraph-breaking so lazy continuation does
  not cross them
- reject checklist-looking lines hidden inside persistent HTML blocks
- preserve valid nested checklist behavior after list-indented HTML wrappers
  when the wrapper contains blank interior lines
- collapse stale list context on relevant nonblank structural lines, including
  outdented closes and other lines that prove the earlier list scope has ended

Checklist validation should keep list-state policy local, but it should never
re-implement HTML classification.

## Test Strategy

The direct helper contract should be tested before end-to-end semantics.

### Direct helper coverage

Add focused helper tests for:

- generic wrappers such as `<custom-tag>...</custom-tag>`
- allowlisted wrappers such as `<details>...</details>` with blank interior
  lines
- inline opener forms such as `<details><summary>...</summary>`
- single-line raw tags such as `<script>hidden</script>`
- void tags such as `<hr>`
- standalone closing tags such as `</details>`

### Downstream regression coverage

Keep and extend existing end-to-end tests so they prove:

- hidden headings do not satisfy required sections
- HTML-hidden checklist items do not satisfy
  `require_checklist_in_success_criteria`
- valid visible nested checklist items still count after list-indented HTML
  wrappers with blank interior lines
- heading parsing resumes correctly after single-line raw-tag wrappers

## Execution Decomposition

This remediation was tracked as the following child issues under `BEL-816`:

- `BEL-838`: document the remediation design
- `BEL-839`: add direct HTML block contract tests
- `BEL-840`: canonicalize shared HTML block classification and state
  transitions
- `BEL-841`: rewire downstream consumers and prepare the replacement PR

These issues reflect the earlier remediation stack and should be read as
historical traceability, not as the execution source for BEL-847 and later
parser-library migration work.

## Replacement PR Strategy

Historical note:

This section refers to the earlier PR `#27` remediation strategy and is kept
only for audit history.

- Keep PR `#27` open only as reference while the replacement implementation is
  prepared.
- Start a fresh branch from `main`.
- Re-implement the final remediation cleanly instead of stacking more fixes on
  top of PR `#27`.
- Open a new draft PR that explicitly states it supersedes PR `#27`.
- Close PR `#27` only after the replacement PR exists and captures the full
  coherent plan.

## Default Decisions

- Default to the smallest explicit contract that closes the validated Group 3
  regressions without widening the public MVP scope.
- Prefer deterministic helper-level tests over indirect coverage when the two
  disagree.
- When behavior must choose between preserving valid visible checklist items
  and rejecting HTML-hidden checklist items, require the shared helper to make
  the structural distinction explicit rather than encoding more local
  exceptions in consumer code.
