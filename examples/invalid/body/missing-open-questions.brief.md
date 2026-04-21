---
doc_spec: agent-markdown/0.1
doc_kind: brief
doc_profile: brief/basic@v1
title: Demonstrate a missing required brief section
audience:
  - maintainers
owners:
  - agent-markdown maintainers
---
## Objective

Provide a brief fixture that resolves cleanly but omits one required heading.

## Context / Constraints

Every declared field should remain valid, and the present sections should
remain non-empty, so the missing heading is the primary failure.

## Recommendation

Keep the failure isolated to the missing `Open questions` section so structural
validation can report that contract violation precisely.
