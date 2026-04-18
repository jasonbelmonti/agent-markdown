---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/experimental@v9
title: Exercise unknown profile handling
status: proposed
owners:
  - agent-markdown maintainers
---
## Objective

Provide a syntactically valid task document whose declared profile is not in the
MVP registry.

## Context / Constraints

Keep the declaration fields, metadata types, and body sections valid so the
unknown profile reference is the only dominant failure.

## Materially verifiable success criteria

- [ ] The document declares the supported doc spec and task kind.
- [ ] The document body matches the canonical task section shape.
- [ ] Resolution fails because `task/experimental@v9` is not in the registry.

## Execution notes

Avoid introducing incompatible `doc_kind` or missing-section noise.
