---
doc_spec: agent-markdown/0.1
doc_kind: project
doc_profile: project/basic@v1
title: Demonstrate a missing required project section
status: active
owners:
  - agent-markdown maintainers
horizon: MVP
---
## Objective

Provide a project fixture that resolves cleanly but omits one required heading.

## Context / Constraints

Every declared field should remain valid, and the present sections should
remain non-empty, so the missing heading is the primary failure.

## Scope / Non-goals

- In scope: omitting exactly one required project section.
- Non-goal: changing the declared profile or metadata types.

## Execution notes

Leave out `Success measures` on purpose so later structural validation can
report that contract violation precisely.
