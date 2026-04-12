---
profile_id: brief/basic@v1
doc_spec: agent-markdown/0.1
doc_kind: brief
title: Basic brief profile
discovery:
  filenames:
    - BRIEF.md
  globs:
    - "**/*.brief.md"
metadata:
  required:
    - name: title
      type: string
      description: Human-readable summary of the brief's focus.
  optional:
    - name: audience
      type: string_array
      description: Intended readers or consumers of the brief.
    - name: owners
      type: string_array
      description: People or roles responsible for maintaining the brief.
    - name: updated_on
      type: date
      description: Most recent date the framing was materially revised.
body:
  required_sections:
    - Objective
    - Context / Constraints
    - Recommendation
    - Open questions
  optional_sections:
    - Evidence
    - Alternatives considered
    - Notes
validation:
  require_declared_doc_spec: agent-markdown/0.1
  require_declared_doc_kind: brief
  require_required_sections: true
  require_nonempty_sections:
    - Objective
    - Context / Constraints
    - Recommendation
    - Open questions
affordances:
  role: context
  actionability: reference
  normative_sections:
    - Objective
    - Context / Constraints
    - Recommendation
    - Open questions
---

# Purpose

Use this profile for situational context, framing, or a recommended direction
that should inform later planning or execution. The document is intended to be
referenced rather than directly executed.

# Required instance declaration

Instance documents governed by this profile should declare:

- `doc_spec: agent-markdown/0.1`
- `doc_kind: brief`
- `doc_profile: brief/basic@v1`

# Authoring guidance

`Objective` should explain the framing problem or decision space the brief is
meant to clarify.

`Context / Constraints` should capture the surrounding facts, assumptions,
dependencies, and boundaries that shape the recommendation.

`Recommendation` should present the preferred direction or interpretation.

`Open questions` is a required section in the MVP spec and should call out the
unknowns, decisions, or validation items that remain unresolved.
