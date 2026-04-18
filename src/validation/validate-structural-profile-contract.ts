import type { LoadedProfileDocument } from "../core-model/profiles.ts";
import type { NormalizedSection } from "../core-model/sections.ts";
import type { ValidationMessage } from "../core-model/validation.ts";

const successCriteriaHeading = "Materially verifiable success criteria";
const checklistItemPattern = /(^|\n)- \[(?: |x|X)\] /u;

export interface StructuralValidationOptions {
  profile: LoadedProfileDocument;
  metadata: Record<string, unknown>;
  bodySections: NormalizedSection[];
}

export function validateStructuralProfileContract(
  options: StructuralValidationOptions,
): ValidationMessage[] {
  const { profile, metadata, bodySections } = options;
  const topLevelSectionByHeading = createTopLevelSectionMap(bodySections);

  return [
    ...validateRequiredMetadata(profile, metadata),
    ...validateRequiredSections(profile, topLevelSectionByHeading),
    ...validateNonemptySections(profile, topLevelSectionByHeading),
    ...validateChecklistRule(profile, topLevelSectionByHeading),
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
  sectionByHeading: Map<string, NormalizedSection>,
): ValidationMessage[] {
  if (!profile.validation.require_required_sections) {
    return [];
  }

  return profile.body.required_sections.flatMap((heading) => {
    if (sectionByHeading.has(heading)) {
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
  sectionByHeading: Map<string, NormalizedSection>,
): ValidationMessage[] {
  return (profile.validation.require_nonempty_sections ?? []).flatMap((heading) => {
    const section = sectionByHeading.get(heading);

    if (section === undefined || section.contentMarkdown.trim().length > 0) {
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
  sectionByHeading: Map<string, NormalizedSection>,
): ValidationMessage[] {
  if (!profile.validation.require_checklist_in_success_criteria) {
    return [];
  }

  const section = sectionByHeading.get(successCriteriaHeading);

  if (
    section === undefined ||
    checklistItemPattern.test(section.contentMarkdown)
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

function createTopLevelSectionMap(
  bodySections: NormalizedSection[],
): Map<string, NormalizedSection> {
  return new Map(
    bodySections
      .filter((section) => section.headingPath.length === 1)
      .map((section) => [section.heading, section] as const),
  );
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
