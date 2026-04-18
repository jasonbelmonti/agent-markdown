---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Publish the MVP task example
status: ready
owners:
  - agent-markdown maintainers
---
## Objective

Provide a concrete `task/basic@v1` document that downstream tooling can load
without guessing declaration fields or section shape.

## Context / Constraints

This repository is responsible for shipping valid example documents for the MVP.
The example should stay intentionally small while still showing the canonical
declaration model and the normative task sections.

## Materially verifiable success criteria

- [ ] The document declares `doc_spec`, `doc_kind`, `doc_profile`, and `title`.
- [ ] The body includes every required `task/basic@v1` section exactly once.
- [ ] The success criteria section uses checklist items that are objectively
  checkable.

## Execution notes

Keep the example readable enough that parser, validation, normalization, and CLI
tests can all reuse it as a baseline fixture.
