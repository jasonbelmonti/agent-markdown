export function readRecord(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
): Record<string, unknown> {
  return ensureRecord(record[key], key, sourcePath);
}

export function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
  parentPath?: string,
): string {
  const value = record[key];
  const fieldPath = parentPath ? `${parentPath}.${key}` : key;

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be a non-empty string.`,
    );
  }

  return value;
}

export function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
  parentPath?: string,
): string | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  const fieldPath = parentPath ? `${parentPath}.${key}` : key;

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be a non-empty string when present.`,
    );
  }

  return value;
}

export function readStringArray(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
): string[] {
  return readStringArrayValue(record[key], key, sourcePath);
}

export function readOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
  parentPath?: string,
): string[] | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  const fieldPath = parentPath ? `${parentPath}.${key}` : key;

  return readStringArrayValue(value, fieldPath, sourcePath);
}

export function readRequiredBoolean(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
  fieldPath?: string,
): boolean {
  const value = record[key];
  const resolvedFieldPath = fieldPath ?? key;

  if (typeof value !== "boolean") {
    throw new Error(
      `Profile document "${sourcePath}" field "${resolvedFieldPath}" must be a boolean.`,
    );
  }

  return value;
}

export function readOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
  sourcePath: string,
  fieldPath?: string,
): boolean | undefined {
  const value = record[key];
  const resolvedFieldPath = fieldPath ?? key;

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(
      `Profile document "${sourcePath}" field "${resolvedFieldPath}" must be a boolean when present.`,
    );
  }

  return value;
}

function ensureRecord(
  value: unknown,
  fieldPath: string,
  sourcePath: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be a mapping.`,
    );
  }

  return value as Record<string, unknown>;
}

function readStringArrayValue(
  value: unknown,
  fieldPath: string,
  sourcePath: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Profile document "${sourcePath}" field "${fieldPath}" must be an array of strings.`,
    );
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(
        `Profile document "${sourcePath}" field "${fieldPath}[${index}]" must be a non-empty string.`,
      );
    }

    return item;
  });
}
