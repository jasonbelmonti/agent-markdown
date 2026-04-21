---
profile_id: project/basic@v1
doc_spec: agent-markdown/0.1
doc_kind: project
title: Basic project profile
discovery:
  filenames:
    - PROJECT.md
  globs:
    - "**/*.project.md"
metadata:
  required:
    - name: title
      type: string
      description: Human-readable name of the coordination context.
  optional:
    - name: status
      type: string
      enum:
        - proposed
        - active
        - on_hold
        - completed
        - archived
      description: Lifecycle indicator for the project context.
    - name: owners
      type: string_array
      description: People or roles accountable for coordination and decisions.
    - name: horizon
      type: string
      description: Planning horizon, milestone, or timeframe for the work.
body:
  required_sections:
    - Objective
    - Context / Constraints
    - Scope / Non-goals
    - Success measures
    - Execution notes
  optional_sections:
    - Milestones
    - Dependencies
    - Risks
    - Notes
validation:
  require_declared_doc_spec: agent-markdown/0.1
  require_declared_doc_kind: project
  require_required_sections: true
  require_nonempty_sections:
    - Objective
    - Context / Constraints
    - Scope / Non-goals
    - Success measures
    - Execution notes
affordances:
  role: coordination
  actionability: plan
  normative_sections:
    - Objective
    - Context / Constraints
    - Scope / Non-goals
    - Success measures
    - Execution notes
---

# Purpose

Use this profile for a durable coordination context that spans multiple tasks,
owners, or milestones. The document should orient planning and routing rather
than describe a single execution unit.

# Required instance declaration

Instance documents governed by this profile should declare:

- `doc_spec: agent-markdown/0.1`
- `doc_kind: project`
- `doc_profile: project/basic@v1`
- `title: <human-readable project title>`

# Authoring guidance

`Objective` should define the durable outcome the project exists to achieve.

`Context / Constraints` should capture dependencies, assumptions, external
interfaces, and implementation boundaries that shape planning.

`Scope / Non-goals` should make inclusions and exclusions explicit so adjacent
tasks can be routed correctly.

`Success measures` should describe the outcomes that indicate the project is on
track or complete.

`Execution notes` should capture coordination approach, likely task streams,
risks, or handoff notes for downstream work.
