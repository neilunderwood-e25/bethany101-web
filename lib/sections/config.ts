import type { ReactNode } from "react";
import type { Section } from "./types";

export type HydrateOptions = {
  preview?: boolean;
  locale?: string;
};

export type SectionDefinition = {
  contentfulTypename: string;
  type: Section["type"];
  hydrate: (id: string, options: HydrateOptions) => Promise<Section | null>;
  render: (section: Section) => ReactNode;
};
