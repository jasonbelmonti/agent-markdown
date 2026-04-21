import type { ConformanceLevel, OperatingMode } from "../core-model/conformance.ts";
import type {
  ResolverGuidance,
  ResolverResolutionSource,
  ResolverResponseResolution,
  ResolverTrust,
} from "../resolver-transport/index.ts";

export interface CreateRuntimeResolutionOptions {
  mode: OperatingMode;
  source: ResolverResolutionSource;
  requestedProfileId: string | null;
  effectiveProfileId: string | null;
}

export function createRuntimeResolution(
  options: CreateRuntimeResolutionOptions,
): ResolverResponseResolution {
  return {
    mode: options.mode,
    source: options.source,
    requestedProfileId: options.requestedProfileId,
    effectiveProfileId: options.effectiveProfileId,
  };
}

export function createRuntimeTrustAndGuidance(
  conformance: ConformanceLevel,
  mode: OperatingMode,
): {
  trust: ResolverTrust;
  guidance: ResolverGuidance;
} {
  switch (conformance) {
    case "candidate":
      return {
        trust: {
          mayReference: true,
          mayPlanFrom: false,
          mayExecuteFrom: false,
          requiresUserConfirmation: false,
        },
        guidance: {
          codes: ["treat_as_plain_markdown"],
        },
      };
    case "recognized":
    case "structurally_valid":
      return {
        trust: {
          mayReference: true,
          mayPlanFrom: false,
          mayExecuteFrom: false,
          requiresUserConfirmation: false,
        },
        guidance: {
          codes: ["show_validation_warning"],
        },
      };
    case "semantically_valid":
      return {
        trust: {
          mayReference: true,
          mayPlanFrom: true,
          mayExecuteFrom: mode !== "informational",
          requiresUserConfirmation: mode !== "enforcing",
        },
        guidance: {
          codes: [
            mode === "enforcing"
              ? "safe_for_execution_context"
              : "request_user_confirmation",
          ],
        },
      };
  }
}
