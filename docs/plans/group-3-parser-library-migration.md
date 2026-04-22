# Group 3 Parser Library Migration

Status: BEL-847 parser-selection spike and Markdown engine reboot note

## Objective

Choose the Markdown parser substrate for the Group 3 engine reboot and record
the contract decisions needed to keep the parser choice separate from
`agent-markdown` product semantics.

## Context / Constraints

- This document is the execution output for `BEL-847`.
- PR `#28` closed the HTML-block remediation loop, but it also showed that
  repo-local parsing rules around raw HTML are expensive to maintain and easy
  to destabilize.
- This document supersedes the earlier parser-semantics and execution-source
  role of `docs/plans/group-3-html-block-remediation.md`.
- The goal of this spike is not to change runtime behavior yet. The goal is to
  choose the parser stack and align the design documents with a clearer
  Markdown baseline.
- The repository should avoid competing with well-adopted Markdown semantics
  unless it explicitly chooses to own a narrower contract and the associated
  enforcement burden.

## Materially verifiable success criteria

- [ ] The parser-selection spike identifies the preferred Markdown parser
      substrate for the next engine pass.
- [ ] The chosen stack is compatible with Bun and the current repository
      packaging model.
- [ ] The design note records the rejected alternatives with concrete reasons.
- [ ] The note states the Markdown baseline and explains why profiles should
      not silently narrow parser semantics.

## Execution notes

This spike should remain docs-first.

Implementation is intentionally deferred to later issues:

1. `BEL-848` writes the migration design note and adapter boundary.
2. `BEL-849` introduces the parser-backed adapter seam.
3. `BEL-850` migrates section parsing.
4. `BEL-851` migrates checklist detection and semantic validation.
5. `BEL-852` removes legacy parsing code and locks the final contract.

## Chosen Direction

Use the mdast/micromark stack as the new Markdown engine substrate.

Preferred packages:

- `mdast-util-from-markdown`
- `micromark-extension-gfm`
- `mdast-util-gfm`

Likely supporting utilities:

- `unist-util-visit`
- `mdast-util-to-string`

## Why This Stack

This stack matches the repository problem shape more closely than the
alternatives.

- The repo needs a Markdown parser first, not a generic HTML parser.
- The core semantic needs are headings, section boundaries, lists, and GFM
  task-list items.
- The mdast/micromark stack gives a direct syntax tree without requiring the
  broader remark processing pipeline when a smaller boundary is sufficient.
- A quick Bun-compatible local spike suggested that the stack produces nested
  task-list structure in the shape the repository needs for checklist
  validation, which is strong enough to justify the migration direction even
  though the full adapter design still belongs in `BEL-848`.

## Rejected Alternatives

### `remark-parse` as the primary stack

Rejected as the default substrate for now.

Reason:

- It is a valid option, but it introduces a broader plugin pipeline than the
  repository currently needs.
- The BEL-847 goal is to choose the smallest well-adopted engine that gives us
  a stable Markdown AST boundary.
- If later work needs remark's wider ecosystem, it can still be adopted above
  the same mdast foundation.

### `parse5` as the primary stack

Rejected.

Reason:

- `parse5` is an HTML parser, not a Markdown parser.
- The recurring failures in this repository live at the Markdown structure
  seam: headings, list continuation, task-list items, and embedded raw HTML as
  interpreted by Markdown.
- Using `parse5` as the primary engine would still leave the repository
  hand-owning the Markdown grammar around it.

## Markdown Baseline Decision

The base meta-spec should align with standard Markdown semantics instead of
silently layering repo-local parser rules on top.

Direction:

- GitHub Flavored Markdown is the baseline for instance-document bodies.
- Task-list semantics are the GFM feature currently used directly by the MVP
  task-profile contract, but the chosen parser direction accepts the broader
  GFM surface.
- Raw HTML is allowed and interpreted according to the chosen Markdown engine.
- The core meta-spec should not promise repo-local HTML-hiding behavior that a
  standard Markdown parser does not naturally provide.

## Why The HTML Question Must Be A Contract Decision

The parser spike surfaced the critical design seam:

- standard Markdown parsers correctly identify nested task-list structure
- standard Markdown parsers do not automatically treat wrapper content inside
  tags such as `<details>` as semantically hidden in the repo-specific way PR
  `#28` enforced

That means the repository has to choose one of two stable paths:

1. follow standard Markdown/GFM semantics and keep the parser boundary clean
2. define stricter repo-local semantics and explicitly carry the enforcement
   burden

BEL-847 chooses the first path for the base meta-spec.

## Profile-Narrowing Rule

Profiles may validate parsed structure, but they should not quietly redefine
the Markdown engine contract.

If a future profile wants to narrow the accepted authoring surface, it must:

- state the narrower rule explicitly in the profile contract
- provide validator support that actually enforces it
- accept the fragility and maintenance burden that comes with diverging from
  the shared parser baseline

This keeps the base meta-spec honest and prevents hidden implementation quirks
from becoming accidental product promises.

## Immediate Follow-On

`BEL-848` should use this document as the starting point for the full migration
design note.

That note should define:

- the internal adapter boundary from mdast to `agent-markdown`
- the migration order for section parsing and checklist validation
- the cleanup plan for the legacy HTML-block machinery
