---
doc_spec: agent-markdown/0.1
doc_kind: project
doc_profile: project/basic@v1
title: Coordinate the MVP fixture corpus
status: active
owners:
  - agent-markdown maintainers
horizon: MVP
---
## Objective

Define the durable coordination context for publishing the MVP example corpus so
related tasks can route against one stable project document.

## Context / Constraints

The repository owns the valid and invalid example corpus. The project should
stay narrowly focused on examples that prove the declared profile contracts
without expanding scope into broader workflow automation.

## Scope / Non-goals

- In scope: author and maintain the small set of valid example documents needed
  by the MVP profiles.
- Non-goal: introduce new profile rules or product behavior that is not already
  declared by the specification and profiles.

## Success measures

- A valid example exists for each MVP profile under a stable repository path.
- Downstream work can reference the example corpus without inventing file
  locations or body-section structure.

## Execution notes

Keep naming deterministic and easy to mirror later when invalid fixtures are
added for validator-focused test coverage.
