# Agent Markdown Profile System

Status: Design draft 0.1

## 1. Summary

This document proposes a generalized system for agent-readable Markdown
documents.

The motivating idea is simple:

- `AGENTS.md` explains how an agent should operate in an environment.
- `SKILL.md` explains how an agent performs a reusable class of work.
- `TASK.md` explains the job to be done for a particular unit of work.

Those are useful examples, but the deeper opportunity is not any one filename.
The deeper opportunity is a portable system for defining special Markdown
document kinds with explicit semantics that agents can discover, parse,
validate, and act on consistently.

This document describes the core design for that system.

## 2. Problem

Today, agent workflows depend heavily on conventions that are only partially
formalized:

- some filenames have widely understood meaning
- some Markdown files have common heading structures
- some tools rely on frontmatter
- much of the actual semantics live in prompts, habits, or vendor-specific UI

That creates several problems:

- document meaning is often inferred instead of declared
- agents have to guess how much structure is normative
- teams cannot reliably introduce new document kinds
- validation and interoperability are weak
- the same idea gets reimplemented differently across tools

The goal is to replace ad hoc convention with an explicit profile system.

## 3. Core Claim

Agents can work with arbitrary special Markdown documents if those documents are
not truly arbitrary.

The system must make document semantics:

- declared
- versioned
- machine-interpretable
- portable
- extensible

In other words, agents should not be expected to infer what `PROJECT.md` means
from filename alone. They should be able to resolve that document against a
declared profile and operate from the profile contract.

## 4. Goals

### 4.1 Primary goals

- Define a small meta-model for special agent-readable Markdown documents.
- Allow teams to declare new document kinds such as `task`, `project`, `brief`,
  `plan`, or `decision`.
- Separate discovery hints such as filenames from canonical semantics.
- Make documents parseable into a normalized structured model.
- Support validation of both structured metadata and narrative body structure.
- Keep the system portable across editors, repos, and model providers.

### 4.2 Secondary goals

- Support profile-specific routing hints for agents and tools.
- Support progressive interoperability, from loose conventions to strict
  validation.
- Allow multiple profile families to coexist in one repository.

### 4.3 Non-goals

- Standardizing a full project-management ontology on day one
- Replacing issue trackers, docs tools, or chat systems entirely
- Encoding all semantics in filenames
- Requiring one universal body template for every document kind
- Solving permissions, auth, workflow automation, or UI concerns in the core
  design

## 5. Design Principles

### 5.1 Declared semantics over inferred semantics

Meaning should come from an explicit profile identifier, not from filename,
path, or prompt folklore.

### 5.2 Filenames are hints, not truth

`TASK.md`, `PROJECT.md`, and similar names are useful discovery affordances, but
they should not be the only semantic anchor.

### 5.3 Markdown remains the primary human interface

The system should preserve Markdown as the canonical authoring format for human
readability, Git friendliness, and portability.

### 5.4 Structure should be explicit but lightweight

The system should support meaningful validation without forcing every document
into an overbuilt schema.

### 5.5 The meta-model should stay small

The core should define how document kinds are declared and interpreted, not try
to standardize every business concept.

### 5.6 Version everything that affects behavior

Profiles, normalization rules, and validation semantics should be versioned so
agents can reason reliably across time.

## 6. Core Concepts

The system needs a small set of first-class concepts.

### 6.1 Document instance

A concrete Markdown file that claims conformance to a document profile.

Examples:

- `TASK.md`
- `docs/briefs/runtime-architecture.md`
- `projects/project-alpha/PROJECT.md`

### 6.2 Document kind

A broad semantic category such as:

- `task`
- `project`
- `brief`
- `decision`
- `skill`
- `agent_manual`

`kind` is useful for routing and understanding, but it is not by itself enough
to define a full contract.

### 6.3 Profile

A specific, versioned contract for a document kind.

Examples:

- `task/basic@v1`
- `project/basic@v1`
- `brief/implementation@v1`

A profile defines the concrete rules for how a document is discovered, parsed,
validated, and interpreted.

### 6.4 Profile registry

A discoverable collection of available profiles.

The registry may be represented as:

- Markdown profile definition files
- JSON or YAML descriptors
- TypeScript modules
- a combination of the above

The important requirement is that profile definitions are machine-readable and
versioned.

### 6.5 Discovery rule

A rule that helps tools find candidate documents for a profile.

Examples:

- exact filename: `TASK.md`
- glob: `**/*.task.md`
- directory pattern: `tasks/**`
- explicit frontmatter declaration

Discovery rules help locate candidates, but successful discovery does not by
itself determine semantic validity.

### 6.6 Canonical semantic declaration

The field or fields inside a document that state which profile governs it.

Example frontmatter:

```yaml
---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Add dependency graph validation
---
```

This declaration is the canonical semantic anchor for the instance document.

### 6.7 Normalized document model

A structured in-memory representation produced by parsing a Markdown document
against a profile.

This model should let tools reason about:

- identity
- type and profile
- structured metadata
- narrative sections
- validation status
- profile-specific affordances

### 6.8 Validation contract

The set of rules that determine whether a document conforms to its profile.

Validation may cover:

- frontmatter shape
- required fields
- section presence
- section ordering
- checklist semantics
- enum vocabularies
- cross-reference rules

### 6.9 Agent affordances

Profile-defined hints that help an agent know how to use the document.

Examples:

- whether the document defines work, policy, context, or reusable capability
- which sections are normative
- whether success criteria are required to be materially verifiable
- whether the document is intended for routing, planning, execution, or review

These affordances help agents operate consistently without hard-coding a fixed
set of special filenames.

### 6.10 Markdown parsing baseline

The meta-spec should define the Markdown parsing baseline once so individual
profiles do not accidentally turn parsing behavior into local folklore.

Default direction:

- GitHub Flavored Markdown defines the shared body-parsing model for instance
  documents
- task-list semantics are the currently important GFM feature for the MVP task
  profile, but the shared parser contract is not limited to that single
  extension
- raw HTML is interpreted according to the selected Markdown engine rather than
  hidden or reinterpreted by profile-local heuristics

Profiles may add validation rules over parsed structure, but they should not
silently redefine what counts as a heading, list, task item, or HTML block.

If a profile wants a narrower authoring surface than the meta-spec baseline, it
must:

- declare that narrower rule explicitly
- provide validator support that actually enforces it
- accept the compatibility and maintenance burden of diverging from the shared
  Markdown engine contract

## 7. Proposed Meta-Model

The core system should define a minimal abstract model for special Markdown
documents.

An instance document should support:

- a document system version such as `doc_spec`
- a broad category such as `doc_kind`
- a canonical profile identifier such as `doc_profile`
- document-level metadata defined by the profile
- narrative body content
- profile-governed section structure
- optional extension data

At the meta-model level, the system should avoid standardizing document-specific
fields like `assignee`, `deadline`, or `decision_status`. Those belong in
profiles, not in the global core.

## 8. Profile Definition Responsibilities

A profile should be able to define the following.

### 8.1 Identity and applicability

- `profile_id`
- supported `doc_kind`
- compatible `doc_spec` versions
- intended use or purpose

### 8.2 Discovery hints

- preferred filenames
- allowed glob patterns
- optional directory conventions

### 8.3 Metadata contract

- required frontmatter fields
- optional frontmatter fields
- allowed value vocabularies
- extension namespaces

### 8.4 Body contract

- required headings
- optional headings
- whether heading order matters
- whether certain headings are normative

### 8.5 Validation rules

- structural validation
- semantic validation
- profile-specific invariants

Validation rules should operate on the parsed Markdown structure produced by
the shared engine contract. They should not quietly replace that parsing model
with profile-local interpretations of raw HTML, list continuation, or heading
visibility.

### 8.6 Agent-use semantics

- what role the document plays in an agent workflow
- whether it is executable work, context, policy, reusable skill, or planning
- how strict an agent should be about missing sections or invalid structure

### 8.7 Round-trip expectations

- what content must be preserved exactly
- what normalization is allowed
- what rewrites are serialization-only versus semantic changes

## 9. Discovery and Resolution Model

The system should resolve documents in stages.

### 9.1 Stage 1: Candidate discovery

Tools scan a repository, directory, or vault for Markdown files that match
known discovery patterns.

### 9.2 Stage 2: Semantic declaration read

Tools parse lightweight document metadata to determine whether the document
declares `doc_spec`, `doc_kind`, and `doc_profile`.

### 9.3 Stage 3: Profile lookup

Tools resolve the declared profile in the registry.

If the profile cannot be resolved, the document may still be discovered but
should be treated as unresolved or non-conformant.

### 9.4 Stage 4: Full parse and normalization

Tools parse the document body and metadata according to the resolved profile.

### 9.5 Stage 5: Validation and affordance projection

Tools validate the document and project any profile-defined affordances needed
by agents or downstream systems.

This staged model keeps discovery cheap while allowing strong semantics once a
profile is known.

## 10. Why Filenames Cannot Be Canonical

The system should explicitly avoid making filenames the primary semantic layer.

Reasons:

- multiple documents of the same kind often need to coexist
- teams use different naming conventions
- files move, split, and get renamed
- a filename does not tell an agent which version of a contract applies
- the same filename may mean different things in different systems

The system should still support filename conventions because they are valuable
for ergonomics. They are just not sufficient as canonical meaning.

## 11. Body Structure as First-Class Semantics

One of the strongest ideas in this space is that section structure in Markdown
is not merely presentational. It can be semantically meaningful.

Examples:

- in a task document, `Materially verifiable success criteria` may be normative
- in a brief document, `Open questions` may be expected but optional
- in an agent manual, `Hard rules` may carry stronger force than `Notes`

This suggests that a good profile system should treat headings as part of the
validation and interpretation contract, not just as freeform prose decoration.

That does not require one rigid universal template. It requires profiles to
declare when body structure matters.

## 12. Normalized Output Shape

A normalized document representation should probably separate source-preserving
data from interpretation-friendly data.

One plausible shape:

```json
{
  "document": {
    "doc_spec": "agent-markdown/0.1",
    "doc_kind": "task",
    "doc_profile": "task/basic@v1",
    "title": "Add dependency graph validation"
  },
  "body": {
    "raw_markdown": "...",
    "sections": [
      {
        "heading": "Objective",
        "level": 2,
        "content": "..."
      }
    ]
  },
  "validation": {
    "valid": true,
    "errors": []
  },
  "affordances": {
    "defines_work": true,
    "requires_checkable_success_criteria": true
  }
}
```

The exact shape can evolve, but the important design point is separation
between raw source, normalized structure, validation, and projected semantics.

## 13. Extension Model

The system needs an explicit extension mechanism so profiles can add fields
without fragmenting interoperability.

Recommended approach:

- keep core document fields minimal
- allow profile-defined fields in a declared namespace
- allow implementation-specific extensions under an `extensions` map when needed

This keeps the base interoperable while still allowing local specialization.

## 14. Versioning Model

At minimum, there are three layers that may need versioning.

### 14.1 Document system version

The version of the overall meta-model, for example `agent-markdown/0.1`.

### 14.2 Profile version

The version of a concrete profile, for example `task/basic@v1`.

### 14.3 Serialization or parser version

Potentially versioned behavior for parsing or normalization if the system later
supports multiple serialization strategies.

Agents should be able to say:

- which meta-model they understand
- which profiles they support
- what happens when they encounter a newer or unknown version

## 15. Failure Modes to Design For

The system should explicitly account for common failure modes.

### 15.1 Discovered but undeclared documents

A file looks like a special document by name or location, but does not declare a
profile.

### 15.2 Declared but unknown profiles

The document references a profile that is not present in the registry.

### 15.3 Structurally parseable but semantically invalid documents

The Markdown parses, but the profile contract is violated.

### 15.4 Partial conformance

The document is usable as plain Markdown, but some higher-order agent
affordances cannot be trusted.

### 15.5 Profile drift

Human conventions evolve, but the formal profile definitions are not updated.

The design should let tools surface these failures clearly instead of forcing a
binary all-or-nothing model.

## 16. Initial Document Kinds for an MVP

The first version should stay narrow.

Recommended starting profiles:

- `task/basic@v1`
- `project/basic@v1`
- `brief/basic@v1`

Why these three:

- `task` captures executable work
- `project` captures longer-lived coordination context
- `brief` captures situational context and intended direction

This is enough to test whether the system is genuinely general without trying
to model every document humans have ever named in all caps.

## 17. Example Document Shape

Example task document:

```md
---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Add dependency graph validation
status: proposed
---

## Objective

Prevent invalid graph states from being written.

## Context / Constraints

Must keep the validation model deterministic and cheap to run.

## Materially verifiable success criteria

- [ ] Cycles are detected before mutation is committed.
- [ ] Validation errors include the affected document identifiers.
- [ ] Existing valid documents still pass.

## Execution notes

Start with semantic validation and test fixtures before wiring API behavior.
```

This example shows the intended split:

- frontmatter carries the declared semantic contract
- body headings carry profile-level narrative structure

## 18. Key Open Design Questions

These questions should be answered before implementation hardens.

### 18.1 Where should profile definitions live?

Options:

- Markdown documents
- JSON or YAML descriptors
- TypeScript definitions
- dual format with docs plus executable schema

### 18.2 How much meaning belongs in frontmatter versus headings?

Some fields may be better modeled as structured metadata; others may be better
modeled as required narrative sections.

### 18.3 How strict should conformance be?

Should missing required headings invalidate the document, or merely degrade its
agent affordances?

### 18.4 How should profile inheritance work?

It may be useful for `task/basic@v1` and `task/implementation@v1` to share a
base contract, but inheritance increases complexity.

### 18.5 Should the system standardize agent-use semantics?

For example, should there be a core vocabulary for concepts like:

- defines work
- defines policy
- defines reusable capability
- defines context

### 18.6 What is the minimum useful registry mechanism?

The registry should be portable and simple enough that a small repo can adopt it
without building a platform first.

## 19. Recommended Foundation for This Repository

This repository should be built around four layers.

### 19.1 Meta-spec

Define the core abstract model for agent-readable Markdown documents.

### 19.2 Profile definitions

Define concrete profiles such as `task/basic@v1` and `project/basic@v1`.

### 19.3 Parser and validator

Implement discovery, profile resolution, normalization, and validation.

### 19.4 Example corpus

Provide valid and invalid sample documents to prove the system behavior.

This sequencing matters. The design should land before code so the
implementation does not prematurely encode accidental assumptions.

## 20. Proposed Next Step

The next artifact should be a more formal design brief for this repository that
settles:

- repository name
- meta-spec name and versioning convention
- profile definition format
- initial MVP profile set
- conformance strictness model
- normalized output contract

Once those are decided, the Bun + TypeScript implementation can be scaffolded
around the agreed design rather than around implementation guesses.
