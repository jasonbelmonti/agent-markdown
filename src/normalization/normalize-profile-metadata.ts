import type {
  LoadedProfileDocument,
  ProfileMetadataField,
} from "../core-model/profiles.ts";

export function normalizeProfileMetadata(
  profile: LoadedProfileDocument | null,
  rawFrontmatter: Record<string, unknown>,
): Record<string, unknown> {
  if (profile === null) {
    return {};
  }

  const metadata: Record<string, unknown> = {};

  for (const field of getMetadataFields(profile)) {
    const normalizedValue = normalizeMetadataFieldValue(
      field,
      rawFrontmatter[field.name],
    );

    if (normalizedValue !== undefined) {
      metadata[field.name] = normalizedValue;
    }
  }

  return metadata;
}

function normalizeMetadataFieldValue(
  field: ProfileMetadataField,
  value: unknown,
): unknown | undefined {
  switch (field.type) {
    case "string":
      return typeof value === "string" ? value : undefined;
    case "string_array":
      return isStringArray(value) ? [...value] : undefined;
    case "date":
      if (typeof value === "string") {
        return value;
      }

      if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return value.toISOString().slice(0, 10);
      }

      return undefined;
  }
}

function getMetadataFields(profile: LoadedProfileDocument): ProfileMetadataField[] {
  return [...profile.metadata.required, ...profile.metadata.optional];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
