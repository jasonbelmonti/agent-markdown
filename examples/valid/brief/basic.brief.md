---
doc_spec: agent-markdown/0.1
doc_kind: brief
doc_profile: brief/basic@v1
title: Recommend a stable example layout
audience:
  - maintainers
  - tooling authors
owners:
  - agent-markdown maintainers
---
## Objective

Clarify the recommended location and shape for valid example documents so later
tooling work can consume the corpus consistently.

## Context / Constraints

The MVP spec recommends an `examples/valid/` and `examples/invalid/` layout.
The brief should remain reference-oriented and avoid turning into a task or
project tracker.

## Recommendation

Store one minimal, profile-named valid document per MVP profile under
`examples/valid/<kind>/` so humans and tools can find representative instances
without ambiguity.

## Open questions

- Should future invalid fixtures mirror the same per-kind directory structure?
- Do later CLI commands need an additional manifest, or is path-based discovery
  sufficient for the MVP?
