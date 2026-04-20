import type { OperatingMode } from "../core-model/conformance.ts";

export type ResolverResolutionSource =
  | "declaration"
  | "discovery_fallback"
  | "profile_override";

export interface ResolverResponseResolution {
  mode: OperatingMode;
  source: ResolverResolutionSource;
  requestedProfileId: string | null;
  effectiveProfileId: string | null;
}

/**
 * BEL-719 locks the resolver trust and guidance policy for future runtime
 * implementations:
 *
 * - candidate:
 *   mayReference=true, mayPlanFrom=false, mayExecuteFrom=false,
 *   requiresUserConfirmation=false,
 *   codes=["treat_as_plain_markdown"]
 * - recognized:
 *   mayReference=true, mayPlanFrom=false, mayExecuteFrom=false,
 *   requiresUserConfirmation=false,
 *   codes=["show_validation_warning"]
 * - structurally_valid:
 *   mayReference=true, mayPlanFrom=false, mayExecuteFrom=false,
 *   requiresUserConfirmation=false,
 *   codes=["show_validation_warning"]
 * - semantically_valid + informational:
 *   mayReference=true, mayPlanFrom=true, mayExecuteFrom=false,
 *   requiresUserConfirmation=true,
 *   codes=["request_user_confirmation"]
 * - semantically_valid + assistive:
 *   mayReference=true, mayPlanFrom=true, mayExecuteFrom=true,
 *   requiresUserConfirmation=true,
 *   codes=["request_user_confirmation"]
 * - semantically_valid + enforcing:
 *   mayReference=true, mayPlanFrom=true, mayExecuteFrom=true,
 *   requiresUserConfirmation=false,
 *   codes=["safe_for_execution_context"]
 */
export interface ResolverTrust {
  mayReference: boolean;
  mayPlanFrom: boolean;
  mayExecuteFrom: boolean;
  requiresUserConfirmation: boolean;
}

export type ResolverGuidanceCode =
  | "treat_as_plain_markdown"
  | "show_validation_warning"
  | "request_user_confirmation"
  | "safe_for_execution_context";

export interface ResolverGuidance {
  codes: ResolverGuidanceCode[];
}
