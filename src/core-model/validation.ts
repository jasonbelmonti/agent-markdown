import type { ConformanceLevel } from "./conformance.ts";

export type ValidationSeverity = "error" | "warning";

export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
}

export interface NormalizedValidation {
  conformance: ConformanceLevel;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}
