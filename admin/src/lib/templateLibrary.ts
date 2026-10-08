import type { InteractionTemplate, InteractionTemplateLevel, InteractionType } from "../domain/types";
import { INTERACTION_TYPES } from "./interactionTypes";

export const TEMPLATE_LEVEL_LABELS: Record<InteractionTemplateLevel, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级"
};

export function templateLevelLabel(level: InteractionTemplateLevel | string) {
  return TEMPLATE_LEVEL_LABELS[level as InteractionTemplateLevel] ?? level;
}

const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** 每个题型的模板数量，用于题型筛选条上的角标。 */
export function countTemplatesByType(templates: InteractionTemplate[]) {
  const counts = {} as Record<InteractionType, number>;
  INTERACTION_TYPES.forEach((type) => {
    counts[type] = 0;
  });
  templates.forEach((template) => {
    counts[template.type] = (counts[template.type] ?? 0) + 1;
  });
  return counts;
}

/**
 * 浏览顺序：没有筛题型时按题型轮转，第一屏就能看到 18 种题型；
 * 筛了题型就按主题 + 难度排，方便连看同一个主题的不同难度。
 */
export function orderTemplatesForBrowse(templates: InteractionTemplate[], activeType: InteractionType | "all") {
  const byTopicThenLevel = (a: InteractionTemplate, b: InteractionTemplate) => {
    const levelDiff = (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9);
    if (levelDiff !== 0) return levelDiff;
    return a.topic.localeCompare(b.topic, "zh-Hans-CN");
  };

  if (activeType !== "all") return [...templates].sort(byTopicThenLevel);

  // 同一题型内部按难度 / 主题排，再让每种题型从不同的主题起头，最后逐条轮流取出。
  const buckets = new Map<InteractionType, InteractionTemplate[]>();
  templates.forEach((template) => {
    const list = buckets.get(template.type);
    if (list) list.push(template);
    else buckets.set(template.type, [template]);
  });
  const lists = [...buckets.values()].map((list, bucketIndex) => {
    const sorted = [...list].sort(byTopicThenLevel);
    const offset = (bucketIndex * 3) % Math.max(1, sorted.length);
    return sorted.slice(offset).concat(sorted.slice(0, offset));
  });
  const ordered: InteractionTemplate[] = [];
  const longest = lists.reduce((max, list) => Math.max(max, list.length), 0);
  for (let index = 0; index < longest; index += 1) {
    lists.forEach((list) => {
      if (list[index]) ordered.push(list[index]);
    });
  }
  return ordered;
}
