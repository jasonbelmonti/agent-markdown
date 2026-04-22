export interface HtmlBlockFixtureWrapper {
  label: string;
  fixtureSlug: string;
  start: string;
  end: string;
}

export const htmlRawTagNames = [
  "script",
  "style",
  "pre",
  "textarea",
] as const;

export const htmlBlockFixtureWrappers: HtmlBlockFixtureWrapper[] = [
  {
    label: "HTML comments",
    fixtureSlug: "html-comments",
    start: "<!--",
    end: "-->",
  },
  {
    label: "raw HTML blocks",
    fixtureSlug: "raw-html-blocks",
    start: "<details>",
    end: "</details>",
  },
  {
    label: "raw HTML blocks with inline summary",
    fixtureSlug: "raw-html-blocks-inline-summary",
    start: "<details><summary>Summary</summary>",
    end: "</details>",
  },
  {
    label: "generic raw HTML wrappers",
    fixtureSlug: "generic-raw-html-wrappers",
    start: "<custom-tag>",
    end: "</custom-tag>",
  },
];
