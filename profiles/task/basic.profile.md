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
    - name: title
      type: string
      description: Human-readable summary of the concrete work unit.
  optional:
    - name: status
      type: string
      enum:
        - proposed
        - ready
        - in_progress
        - blocked
        - done
      description: Lifecycle indicator for the task.
    - name: owners
      type: string_array
      description: People or roles accountable for delivery.
    - name: due_date
      type: date
      description: Target completion date when scheduling matters.
body:
  required_sections:
    - Objective
    - Context / Constraints
    - Materially verifiable success criteria
    - Execution notes
  optional_sections:
    - Dependencies
    - Risks
    - Notes
validation:
  require_declared_doc_spec: agent-markdown/0.1
  require_declared_doc_kind: task
  require_required_sections: true
  require_nonempty_sections:
    - Objective
    - Context / Constraints
    - Materially verifiable success criteria
    - Execution notes
  require_checklist_in_sections:
    - Materially verifiable success criteria
affordances:
  role: work
  actionability: execute
  normative_sections:
    - Objective
    - Context / Constraints
    - Materially verifiable success criteria
    - Execution notes
---

# Purpose

Use this profile for a concrete unit of work that an agent or human can execute.
The frontmatter is the canonical contract for discovery, validation, and
affordance projection.

# Required instance declaration

Instance documents governed by this profile should declare:

- `doc_spec: agent-markdown/0.1`
- `doc_kind: task`
- `doc_profile: task/basic@v1`

# Authoring guidance

`Objective` should explain the outcome and why it matters.

`Context / Constraints` should capture dependencies, non-goals, assumptions, and
other implementation boundaries.

`Materially verifiable success criteria` is normative for this profile and must
contain checklist items that can be objectively checked.

`Execution notes` should capture suggested implementation approach, likely files
or systems, risks, and handoff guidance.
