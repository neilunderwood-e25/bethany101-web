import { Fragment, type ReactNode } from "react";
import type { Section } from "./types";
import { sectionRegistry } from "./registry";

type SectionsRendererProps = {
  sections: Section[];
  /**
   * Layout chrome rendered directly after the first section (e.g. the site
   * Header, which sits under the hero on the homepage). Not a page section.
   */
  afterFirstSection?: ReactNode;
};

export const SectionsRenderer = ({
  sections,
  afterFirstSection,
}: SectionsRendererProps) => {
  if (!sections.length) return null;
  return (
    <>
      {sections.map((section, index) => {
        const config = sectionRegistry.find((s) => s.type === section.type);
        return (
          <Fragment key={section.id}>
            {config ? <div>{config.render(section)}</div> : null}
            {index === 0 && afterFirstSection ? afterFirstSection : null}
          </Fragment>
        );
      })}
    </>
  );
};
