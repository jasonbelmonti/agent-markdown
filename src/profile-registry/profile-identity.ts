import type {
  AgentMarkdownDocSpec,
  MvpDocKind,
  MvpProfileId,
} from "../core-model/profiles.ts";

export const supportedAgentMarkdownDocSpec =
  "agent-markdown/0.1" as const satisfies AgentMarkdownDocSpec;

export const supportedMvpProfileIds = [
  "task/basic@v1",
  "project/basic@v1",
  "brief/basic@v1",
] as const satisfies readonly MvpProfileId[];

const supportedMvpDocKinds = ["task", "project", "brief"] as const satisfies
  readonly MvpDocKind[];

const expectedDocKindByProfileId = {
  "task/basic@v1": "task",
  "project/basic@v1": "project",
  "brief/basic@v1": "brief",
} as const satisfies Record<MvpProfileId, MvpDocKind>;

export function isAgentMarkdownDocSpec(
  value: unknown,
): value is AgentMarkdownDocSpec {
  return value === supportedAgentMarkdownDocSpec;
}

export function isMvpDocKind(value: unknown): value is MvpDocKind {
  return (
    typeof value === "string" &&
    supportedMvpDocKinds.includes(value as MvpDocKind)
  );
}

export function isMvpProfileId(value: unknown): value is MvpProfileId {
  return (
    typeof value === "string" &&
    supportedMvpProfileIds.includes(value as MvpProfileId)
  );
}

export function getExpectedDocKind(profileId: MvpProfileId): MvpDocKind {
  return expectedDocKindByProfileId[profileId];
}
