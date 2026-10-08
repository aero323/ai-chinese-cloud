import { useMemo } from "react";
import type { InteractionTemplate, InteractionType } from "../domain/types";
import { INTERACTION_TYPES, INTERACTION_TYPE_SHORT_LABELS } from "../lib/interactionTypes";
import { countTemplatesByType } from "../lib/templateLibrary";

/** 题型筛选条：18 种题型各带数量角标，老师一眼能看出模板库里有哪些题型。 */
export function TemplateTypeChips({
  templates,
  value,
  onChange
}: {
  templates: InteractionTemplate[];
  value: InteractionType | "all";
  onChange: (next: InteractionType | "all") => void;
}) {
  const counts = useMemo(() => countTemplatesByType(templates), [templates]);
  return (
    <div className="template-chip-row">
      <button className={value === "all" ? "active" : ""} onClick={() => onChange("all")}>
        全部题型<span className="template-chip-count">{templates.length}</span>
      </button>
      {INTERACTION_TYPES.map((type) => (
        <button key={type} className={value === type ? "active" : ""} onClick={() => onChange(type)} disabled={!counts[type]}>
          {INTERACTION_TYPE_SHORT_LABELS[type]}<span className="template-chip-count">{counts[type] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
