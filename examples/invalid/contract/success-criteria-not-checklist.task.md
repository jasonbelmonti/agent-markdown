---
doc_spec: agent-markdown/0.1
doc_kind: task
doc_profile: task/basic@v1
title: Demonstrate a non-checklist success criteria section
status: ready
owners:
  - agent-markdown maintainers
---
## Objective

Provide a task fixture that resolves cleanly but violates the checklist rule.

## Context / Constraints

The document should include every required task section and non-empty content so
the success-criteria formatting rule is the only dominant failure.

## Materially verifiable success criteria

- Criteria are present as plain bullets.
- The items are objectively checkable but intentionally omit checkbox markers.
- Later validation should reject the section until it uses `- [ ]`.

## Execution notes

Keep the frontmatter and surrounding headings otherwise canonical.
