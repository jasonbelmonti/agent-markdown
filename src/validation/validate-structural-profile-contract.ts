import type { LoadedProfileDocument } from "../core-model/profiles.ts";
import type { NormalizedSection } from "../core-model/sections.ts";
import type { ValidationMessage } from "../core-model/validation.ts";
import { containsMarkdownChecklistItem } from "./contains-markdown-checklist-item.ts";

const successCriteriaHeading = "Materially verifiable success criteria";

export interface StructuralValidationOptions {
  profile: LoadedProfileDocument;
  metadata: Record<string, unknown>;
  bodySections: NormalizedSection[];
}

export function validateStructuralProfileContract(
  options: StructuralValidationOptions,
): ValidationMessage[] {
  const { profile, metadata, bodySections } = options;
  const sectionsByTopLevelHeading = createSectionsByTopLevelHeading(bodySections);

  return [
    ...validateRequiredMetadata(profile, metadata),
    ...validateRequiredSections(profile, sectionsByTopLevelHeading),
    ...validateNonemptySections(profile, sectionsByTopLevelHeading),
    ...validateChecklistRule(profile, sectionsByTopLevelHeading),
  ];
}

function validateRequiredMetadata(
  profile: LoadedProfileDocument,
  metadata: Record<string, unknown>,
): ValidationMessage[] {
  return profile.metadata.required.flatMap((field) => {
    if (hasUsableMetadataValue(metadata[field.name])) {
      return [];
    }

    return [
      createError(
        "required-metadata-missing",
        `Required metadata field "${field.name}" is missing or invalid for profile "${profile.profile_id}".`,
        `metadata.${field.name}`,
      ),
    ];
  });
}

function validateRequiredSections(
  profile: LoadedProfileDocument,
  sectionsByTopLevelHeading: Map<string, NormalizedSection[]>,
): ValidationMessage[] {
  if (!profile.validation.require_required_sections) {
    return [];
  }

  return profile.body.required_sections.flatMap((heading) => {
    if (sectionsByTopLevelHeading.has(heading)) {
      return [];
    }

    return [
      createError(
        "required-section-missing",
        `Required section "${heading}" is missing for profile "${profile.profile_id}".`,
        createSectionPath(heading),
      ),
    ];
  });
}

function validateNonemptySections(
  profile: LoadedProfileDocument,
  sectionsByTopLevelHeading: Map<string, NormalizedSection[]>,
): ValidationMessage[] {
  return (profile.validation.require_nonempty_sections ?? []).flatMap((heading) => {
    const sections = sectionsByTopLevelHeading.get(heading);

    if (sections === undefined || sections.some(hasNonemptyContent)) {
      return [];
    }

    return [
      createError(
        "required-section-empty",
        `Required section "${heading}" must not be empty for profile "${profile.profile_id}".`,
        createSectionPath(heading),
      ),
    ];
  });
}

function validateChecklistRule(
  profile: LoadedProfileDocument,
  sectionsByTopLevelHeading: Map<string, NormalizedSection[]>,
): ValidationMessage[] {
  if (!profile.validation.require_checklist_in_success_criteria) {
    return [];
  }

  const sections = sectionsByTopLevelHeading.get(successCriteriaHeading);

  if (
    sections === undefined ||
    sections.some((section) => containsMarkdownChecklistItem(section.contentMarkdown))
  ) {
    return [];
  }

  return [
    createError(
      "checklist-required",
      `Section "${successCriteriaHeading}" must contain checklist items for profile "${profile.profile_id}".`,
      createSectionPath(successCriteriaHeading),
    ),
  ];
}

function createSectionsByTopLevelHeading(
  bodySections: NormalizedSection[],
): Map<string, NormalizedSection[]> {
  const sectionsByTopLevelHeading = new Map<string, NormalizedSection[]>();

  for (const section of bodySections) {
    const topLevelHeading = section.headingPath[0];

    if (topLevelHeading === undefined) {
      continue;
    }

    const groupedSections = sectionsByTopLevelHeading.get(topLevelHeading);

    if (groupedSections === undefined) {
      sectionsByTopLevelHeading.set(topLevelHeading, [section]);
      continue;
    }

    groupedSections.push(section);
  }

  return sectionsByTopLevelHeading;
}

function hasUsableMetadataValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null;
}

function createSectionPath(heading: string): string {
  return `body.sections["${heading}"]`;
}

function hasNonemptyContent(section: NormalizedSection): boolean {
  return section.contentMarkdown.trim().length > 0;
}

function createError(
  code: string,
  message: string,
  path: string,
): ValidationMessage {
  return {
    code,
    severity: "error",
    message,
    path,
  };
}
