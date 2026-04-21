import { z } from "zod";

import type { AffordanceActionability, AffordanceRole, ProfileMetadataValueType } from "../core-model/index.ts";
import type {
  DiscoverRequest,
  DiscoverResponse,
  DiscoveredDocumentResolvedSummary,
  ExplainProfileRequest,
  ExplainProfileResponse,
  ResolveRequest,
  ResolveResponse,
  ResolverDocumentInput,
  ResolverProfileDocument,
  ResolverProfileResolutionResult,
  ResolverResponseResolution,
  ResolverTrust,
  ResolverGuidanceCode,
  SniffRequest,
  SniffResponse,
} from "../resolver-transport/index.ts";

const unknownRecordSchema = z.record(z.string(), z.unknown());
const profileResolutionReasonValues = [
  "undeclared_profile",
  "unknown_profile",
  "incompatible_doc_spec",
  "incompatible_doc_kind",
] as const;
const resolverResolutionSourceValues = [
  "declaration",
  "discovery_fallback",
  "profile_override",
] as const;
const resolverGuidanceCodeValues = [
  "treat_as_plain_markdown",
  "show_validation_warning",
  "request_user_confirmation",
  "safe_for_execution_context",
] as const satisfies readonly ResolverGuidanceCode[];
const sniffRecommendationValues = [
  "ignore",
  "resolve",
  "resolve_informational",
] as const;

const profileResolutionReasonSchema = z.enum(profileResolutionReasonValues);
const resolverResolutionSourceSchema = z.enum(resolverResolutionSourceValues);
const resolverGuidanceCodeSchema: z.ZodType<ResolverGuidanceCode> = z.enum(
  resolverGuidanceCodeValues,
);

const resolverDocumentInputSchema: z.ZodType<ResolverDocumentInput> = z.union([
  z.object({
    kind: z.literal("path"),
    path: z.string().min(1),
  }),
  z.object({
    kind: z.literal("content"),
    content: z.string(),
    sourcePath: z.string().min(1).optional(),
  }),
]);

const operatingModeSchema = z.enum([
  "informational",
  "assistive",
  "enforcing",
]);

const conformanceLevelSchema = z.enum([
  "candidate",
  "recognized",
  "structurally_valid",
  "semantically_valid",
]);

const validationSeveritySchema = z.enum(["error", "warning"]);

const affordanceRoleSchema: z.ZodType<AffordanceRole> = z.enum([
  "work",
  "coordination",
  "context",
  "policy",
  "capability",
]);

const affordanceActionabilitySchema: z.ZodType<AffordanceActionability> = z.enum([
  "reference",
  "plan",
  "execute",
]);

const profileMetadataValueTypeSchema: z.ZodType<ProfileMetadataValueType> = z.enum([
  "string",
  "string_array",
  "date",
]);

const normalizedDocumentDeclarationSchema = z.object({
  docSpec: z.string().nullable(),
  docKind: z.string().nullable(),
  docProfile: z.string().nullable(),
  title: z.string().nullable(),
});

const normalizedSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  headingPath: z.array(z.string()),
  level: z.number().int(),
  order: z.number().int(),
  rawMarkdown: z.string(),
  contentMarkdown: z.string(),
});

const validationMessageSchema = z.object({
  code: z.string(),
  severity: validationSeveritySchema,
  message: z.string(),
  path: z.string().optional(),
});

const projectedAffordancesSchema = z.object({
  role: affordanceRoleSchema.nullable(),
  actionability: affordanceActionabilitySchema.nullable(),
  normativeSections: z.array(z.string()),
});

const profileAffordancesSchema = z.object({
  role: affordanceRoleSchema,
  actionability: affordanceActionabilitySchema,
  normative_sections: z.array(z.string()),
});

const rawProfileSourceSchema = z.object({
  path: z.string(),
  rawFrontmatter: unknownRecordSchema,
  rawBodyMarkdown: z.string(),
});

const profileDiscoverySchema = z.object({
  filenames: z.array(z.string()),
  globs: z.array(z.string()),
});

const profileMetadataFieldSchema = z.object({
  name: z.string(),
  type: profileMetadataValueTypeSchema,
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

const profileMetadataContractSchema = z.object({
  required: z.array(profileMetadataFieldSchema),
  optional: z.array(profileMetadataFieldSchema),
});

const profileBodyContractSchema = z.object({
  required_sections: z.array(z.string()),
  optional_sections: z.array(z.string()),
});

const profileValidationRulesSchema = z.object({
  require_declared_doc_spec: z.string(),
  require_declared_doc_kind: z.string(),
  require_required_sections: z.boolean(),
  require_nonempty_sections: z.array(z.string()).optional(),
  require_checklist_in_success_criteria: z.boolean().optional(),
});

const resolverProfileDocumentSchema: z.ZodType<ResolverProfileDocument> = z.object({
  source: rawProfileSourceSchema,
  profile_id: z.string(),
  doc_spec: z.string(),
  doc_kind: z.string(),
  title: z.string(),
  discovery: profileDiscoverySchema,
  metadata: profileMetadataContractSchema,
  body: profileBodyContractSchema,
  validation: profileValidationRulesSchema,
  affordances: profileAffordancesSchema,
});

const profileLookupReferenceSchema = z.object({
  doc_spec: z.string().nullable(),
  doc_kind: z.string().nullable(),
  doc_profile: z.string().nullable(),
});

const profileResolutionCompatibilitySchema = z.object({
  declared_doc_spec: z.string().nullable(),
  profile_doc_spec: z.string().nullable(),
  doc_spec_compatible: z.boolean(),
  declared_doc_kind: z.string().nullable(),
  profile_doc_kind: z.string().nullable(),
  doc_kind_compatible: z.boolean(),
});

const resolverProfileResolutionResultSchema: z.ZodType<ResolverProfileResolutionResult> = z.object({
  reference: profileLookupReferenceSchema,
  resolved: z.boolean(),
  profile_id: z.string().nullable(),
  profile_path: z.string().nullable(),
  profile: resolverProfileDocumentSchema.nullable(),
  reason: profileResolutionReasonSchema.nullable(),
  compatibility: profileResolutionCompatibilitySchema.nullable(),
});

const resolverResponseResolutionSchema: z.ZodType<ResolverResponseResolution> = z.object({
  mode: operatingModeSchema,
  source: resolverResolutionSourceSchema,
  requestedProfileId: z.string().nullable(),
  effectiveProfileId: z.string().nullable(),
});

const resolverTrustSchema: z.ZodType<ResolverTrust> = z.object({
  mayReference: z.boolean(),
  mayPlanFrom: z.boolean(),
  mayExecuteFrom: z.boolean(),
  requiresUserConfirmation: z.boolean(),
});

const resolverGuidanceSchema = z.object({
  codes: z.array(resolverGuidanceCodeSchema),
});

const resolverDiscoveryHintSchema = z.object({
  kind: z.enum(["filename", "glob"]),
  value: z.string(),
  origin: z.object({
    profileId: z.string(),
    profilePath: z.string(),
  }),
});

const normalizedDocumentSchema = z.object({
  source: z.object({
    path: z.string(),
    contentHash: z.string(),
    discoveryMatches: z.array(z.string()),
    rawFrontmatter: unknownRecordSchema,
    rawBodyMarkdown: z.string(),
  }),
  declaration: normalizedDocumentDeclarationSchema,
  profile: z.object({
    resolved: z.boolean(),
    profileId: z.string().nullable(),
    profilePath: z.string().nullable(),
  }),
  metadata: unknownRecordSchema,
  body: z.object({
    sections: z.array(normalizedSectionSchema),
  }),
  validation: z.object({
    conformance: conformanceLevelSchema,
    errors: z.array(validationMessageSchema),
    warnings: z.array(validationMessageSchema),
  }),
  affordances: projectedAffordancesSchema,
  extensions: unknownRecordSchema,
});

const discoverResolvedSummarySchema: z.ZodType<DiscoveredDocumentResolvedSummary> = z.object({
  conformance: conformanceLevelSchema,
  profile: z.object({
    resolved: z.boolean(),
    profileId: z.string().nullable(),
    profilePath: z.string().nullable(),
    reason: profileResolutionReasonSchema.nullable(),
  }),
  resolution: resolverResponseResolutionSchema,
  trust: resolverTrustSchema,
  guidance: resolverGuidanceSchema,
});

const explainProfileSummarySchema = z.object({
  human: z.string(),
  requiredMetadata: z.array(z.string()),
  optionalMetadata: z.array(z.string()),
  requiredSections: z.array(z.string()),
  optionalSections: z.array(z.string()),
});

export const sniffRequestSchema: z.ZodType<SniffRequest> = z.object({
  input: resolverDocumentInputSchema,
  repoRoot: z.string().optional(),
});

export const sniffResponseSchema: z.ZodType<SniffResponse> = z.object({
  frontmatterFound: z.boolean(),
  declaration: normalizedDocumentDeclarationSchema,
  matchedHints: z.array(resolverDiscoveryHintSchema),
  recommendation: z.enum(sniffRecommendationValues),
});

export const resolveRequestSchema: z.ZodType<ResolveRequest> = z.object({
  input: resolverDocumentInputSchema,
  repoRoot: z.string().optional(),
  mode: operatingModeSchema,
  profileIdOverride: z.string().optional(),
});

export const resolveResponseSchema: z.ZodType<ResolveResponse> = z.object({
  normalizedDocument: normalizedDocumentSchema,
  profileResolution: resolverProfileResolutionResultSchema,
  resolution: resolverResponseResolutionSchema,
  trust: resolverTrustSchema,
  guidance: resolverGuidanceSchema,
});

export const discoverRequestSchema: z.ZodType<DiscoverRequest> = z.object({
  repoRoot: z.string().optional(),
  scopePaths: z.array(z.string()).optional(),
  docKinds: z.array(z.string()).optional(),
  profileIds: z.array(z.string()).optional(),
  mode: operatingModeSchema.optional(),
});

export const discoverResponseSchema: z.ZodType<DiscoverResponse> = z.object({
  documents: z.array(z.object({
    path: z.string(),
    discoveryMatches: z.array(z.string()),
    declaration: normalizedDocumentDeclarationSchema.nullable(),
    resolved: discoverResolvedSummarySchema.nullable(),
  })),
});

export const explainProfileRequestSchema: z.ZodType<ExplainProfileRequest> = z.object({
  profileId: z.string().min(1),
  repoRoot: z.string().optional(),
});

export const explainProfileResponseSchema: z.ZodType<ExplainProfileResponse> = z.object({
  profile: resolverProfileDocumentSchema,
  summary: explainProfileSummarySchema,
});
