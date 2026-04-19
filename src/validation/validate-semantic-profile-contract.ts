import type { LoadedProfileDocument } from "../core-model/profiles.ts";
import type { NormalizedSection } from "../core-model/sections.ts";
import type { ValidationMessage } from "../core-model/validation.ts";

export interface SemanticValidationOptions {
  profile: LoadedProfileDocument;
  bodySections: NormalizedSection[];
}

export interface SemanticValidationResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

export function validateSemanticProfileContract(
  options: SemanticValidationOptions,
): SemanticValidationResult {
  const { profile, bodySections } = options;
  const errors = validateNormativeSectionUniqueness(profile, bodySections);

  if (errors.length === 0) {
    return {
      errors,
      warnings: [],
    };
  }

  return {
    errors,
    warnings: [
      createWarning(
        "degraded-affordance",
        `Affordances remain degraded until semantic validation passes for profile "${profile.profile_id}".`,
        "affordances.actionability",
      ),
    ],
  };
}

function validateNormativeSectionUniqueness(
  profile: LoadedProfileDocument,
  bodySections: NormalizedSection[],
): ValidationMessage[] {
  const topLevelCounts = new Map<string, number>();

  for (const section of bodySections) {
    if (section.headingPath.length !== 1) {
      continue;
    }

    topLevelCounts.set(section.heading, (topLevelCounts.get(section.heading) ?? 0) + 1);
  }

  return profile.affordances.normative_sections.flatMap((heading) => {
    const count = topLevelCounts.get(heading) ?? 0;

    if (count <= 1) {
      return [];
    }

    return [
      createError(
        "normative-section-ambiguous",
        `Normative section "${heading}" must appear at most once at the top level for profile "${profile.profile_id}".`,
        createSectionPath(heading),
      ),
    ];
  });
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

function createWarning(
  code: string,
  message: string,
  path: string,
): ValidationMessage {
  return {
    code,
    severity: "warning",
    message,
    path,
  };
}
