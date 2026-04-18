## Objective

Provide a discovered-but-undeclared task document so tooling can distinguish
suggestive filenames from declared contracts.

## Context / Constraints

This file intentionally omits frontmatter while keeping the canonical
`task/basic@v1` body shape intact.

## Materially verifiable success criteria

- [ ] Discovery still classifies the file as a task candidate by path.
- [ ] Declaration reads preserve the raw body without inventing frontmatter.
- [ ] Later validation can report the document as undeclared.

## Execution notes

Keep the failure mode limited to the missing declaration block.
