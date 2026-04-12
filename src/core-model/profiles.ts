import type { ProfileAffordances } from "./affordances.ts";

export type AgentMarkdownDocSpec = "agent-markdown/0.1";

export type MvpDocKind = "task" | "project" | "brief";

export type MvpProfileId =
  | "task/basic@v1"
  | "project/basic@v1"
  | "brief/basic@v1";

export type ProfileMetadataValueType = "string" | "string_array" | "date";

export interface RawProfileSource {
  path: string;
  rawFrontmatter: Record<string, unknown>;
  rawBodyMarkdown: string;
}

export interface ProfileDiscovery {
  filenames: string[];
  globs: string[];
}

export interface ProfileMetadataField {
  name: string;
  type: ProfileMetadataValueType;
  description?: string;
  enum?: string[];
}

export interface ProfileMetadataContract {
  required: ProfileMetadataField[];
  optional: ProfileMetadataField[];
}

export interface ProfileBodyContract {
  required_sections: string[];
  optional_sections: string[];
}

export interface ProfileValidationRules {
  require_declared_doc_spec: AgentMarkdownDocSpec;
  require_declared_doc_kind: MvpDocKind;
  require_required_sections: boolean;
  require_nonempty_sections?: string[];
  require_checklist_in_success_criteria?: boolean;
}

// Keep the loaded profile contract aligned with the current Markdown frontmatter.
export interface LoadedProfileDocument {
  source: RawProfileSource;
  profile_id: MvpProfileId;
  doc_spec: AgentMarkdownDocSpec;
  doc_kind: MvpDocKind;
  title: string;
  discovery: ProfileDiscovery;
  metadata: ProfileMetadataContract;
  body: ProfileBodyContract;
  validation: ProfileValidationRules;
  affordances: ProfileAffordances;
}
