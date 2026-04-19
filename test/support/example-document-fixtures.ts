import { resolve as resolvePath } from "node:path";

import {
  collectDiscoveryHints,
  composeNormalizedDocument,
  discoverDocumentCandidate,
  loadProfileRegistry,
  parseMarkdownSections,
  readDocumentDeclaration,
  resolveProfileReference,
  type DocumentDiscoveryHint,
  type LoadedProfileRegistry,
} from "../../index.ts";

export const repoRoot = resolvePath(import.meta.dir, "..", "..");
export const checklistPattern = /(^|\n)- \[ \] /u;
export const successCriteriaHeading = "Materially verifiable success criteria" as const;

export async function loadExampleFixtureRegistry(): Promise<LoadedProfileRegistry> {
  return loadProfileRegistry({ repoRoot });
}

export function collectExampleDiscoveryHints(
  registry: LoadedProfileRegistry,
): DocumentDiscoveryHint[] {
  return collectDiscoveryHints(registry);
}

export async function loadExampleFixtureMarkdown(path: string): Promise<string> {
  return Bun.file(resolvePath(repoRoot, path)).text();
}

export function discoverExampleFixture(
  path: string,
  discoveryHints: DocumentDiscoveryHint[],
) {
  const candidate = discoverDocumentCandidate({
    path: resolvePath(repoRoot, path),
    repoRoot,
    discoveryHints,
  });

  if (candidate === null) {
    throw new Error(`Expected fixture "${path}" to match discovery hints.`);
  }

  if (candidate.path !== path) {
    throw new Error(
      `Expected discovered fixture path "${path}" but received "${candidate.path}".`,
    );
  }

  return candidate;
}

export async function loadResolvedExampleFixture(
  path: string,
  options: {
    discoveryHints: DocumentDiscoveryHint[];
    registry: LoadedProfileRegistry;
  },
) {
  const { discoveryHints, registry } = options;
  const candidate = discoverExampleFixture(path, discoveryHints);
  const markdown = await loadExampleFixtureMarkdown(path);
  const document = readDocumentDeclaration({
    candidate,
    markdown,
  });
  const resolution = resolveProfileReference(registry, {
    doc_spec: document.declaration.docSpec,
    doc_kind: document.declaration.docKind,
    doc_profile: document.declaration.docProfile,
  });
  const sections = parseMarkdownSections(document.source.rawBodyMarkdown);
  const normalized = composeNormalizedDocument({
    discoveredDocument: document,
    profileResolution: resolution,
    parsedBody: sections,
  });

  return {
    candidate,
    document,
    resolution,
    sections,
    normalized,
  };
}

export function createSectionContentMap(
  parsedBody: ReturnType<typeof parseMarkdownSections>,
) {
  return new Map(
    parsedBody.sections.map((section) => [section.heading, section.contentMarkdown]),
  );
}
