import type { NormalizedSection } from "../core-model/index.ts";

export interface ParsedMarkdownBody {
  rawMarkdown: string;
  sections: NormalizedSection[];
}
