export function createSectionId(
  headingPath: string[],
  order: number,
  usedIds: Map<string, number>,
): string {
  const baseId = slugifyHeadingPath(headingPath) || `section-${order + 1}`;
  const seenCount = (usedIds.get(baseId) ?? 0) + 1;

  usedIds.set(baseId, seenCount);

  return seenCount === 1 ? baseId : `${baseId}-${seenCount}`;
}

function slugifyHeadingPath(headingPath: string[]): string {
  return headingPath
    .join(" / ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
