export interface NormalizedSection {
  id: string;
  heading: string;
  headingPath: string[];
  level: number;
  order: number;
  rawMarkdown: string;
  contentMarkdown: string;
}
