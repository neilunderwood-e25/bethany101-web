import type { Section } from "./types";
import { sectionRegistry } from "./registry";

type SectionsRendererProps = {
  sections: Section[];
};

export const SectionsRenderer = ({ sections }: SectionsRendererProps) => {
  if (!sections.length) return null;
  return (
    <>
      {sections.map((section, index) => {
        const config = sectionRegistry.find((s) => s.type === section.type);
        if (!config) return null;
        return (
          <div key={section.id || `${section.type}-${index}`}>
            {config.render(section)}
          </div>
        );
      })}
    </>
  );
};
