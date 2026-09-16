import type { ResumeDocument } from "../model/resume";
import { RESUME_TEMPLATES, type ResumeTemplateDefinition, type ResumeTemplateFamily } from "./registry";

export type CareerScene = "business" | "tech" | "academic" | "creative" | "general";
export type VisualTone = "restrained" | "modern" | "expressive";
export type LayoutPreference = "single" | "sidebar" | "structured";

export interface TemplatePreferences {
  scene: CareerScene;
  tone: VisualTone;
  layout: LayoutPreference;
}

export interface TemplateRecommendation {
  template: ResumeTemplateDefinition;
  score: number;
  match: number;
  reason: string;
}

const SCENE_FAMILIES: Record<CareerScene, readonly ResumeTemplateFamily[]> = {
  business: ["business", "classic", "minimal"],
  tech: ["tech", "modern", "minimal"],
  academic: ["academic", "classic", "minimal"],
  creative: ["creative", "editorial", "modern"],
  general: ["minimal", "modern", "classic", "business"],
};

const TONE_FAMILIES: Record<VisualTone, readonly ResumeTemplateFamily[]> = {
  restrained: ["minimal", "classic", "academic", "business"],
  modern: ["modern", "tech", "minimal"],
  expressive: ["creative", "editorial", "modern"],
};

function entryCount(resume: ResumeDocument) {
  return resume.sections.reduce((total, section) => total + (section.type === "education" ? section.items.length : section.entries.length), 0);
}

export function recommendTemplates(resume: ResumeDocument, preferences: TemplatePreferences, limit = 6): TemplateRecommendation[] {
  const entries = entryCount(resume);
  const desiredDensity = entries >= 9 || resume.sections.length >= 7 ? "compact" : entries <= 4 ? "airy" : "balanced";
  const hasPhoto = Boolean(resume.profile.photo);

  const ranked = RESUME_TEMPLATES.map((template) => {
    let score = 20;
    const reasons: string[] = [];
    const sceneRank = SCENE_FAMILIES[preferences.scene].indexOf(template.family);
    if (sceneRank >= 0) {
      score += 28 - sceneRank * 6;
      if (sceneRank === 0) reasons.push("符合求职场景");
    }
    const toneRank = TONE_FAMILIES[preferences.tone].indexOf(template.family);
    if (toneRank >= 0) {
      score += 22 - toneRank * 5;
      if (toneRank === 0) reasons.push("风格偏好一致");
    }
    const layoutMatch = preferences.layout === "structured"
      ? ["cards", "timeline"].includes(template.layout)
      : template.layout === preferences.layout;
    if (layoutMatch) {
      score += 18;
      reasons.push("版式匹配");
    }
    if (template.density === desiredDensity) {
      score += 12;
      reasons.push(desiredDensity === "compact" ? "适合较多内容" : desiredDensity === "airy" ? "适合精简内容" : "内容密度合适");
    }
    if (hasPhoto && template.photo === "recommended") score += 7;
    if (!hasPhoto && template.photo === "optional") score += 7;
    if (template.ats === "high" && preferences.tone !== "expressive") score += 5;
    return { template, score, reasons };
  }).sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name, "zh-CN"));

  const topScore = ranked[0]?.score ?? 100;
  return ranked.slice(0, limit).map(({ template, score, reasons }) => ({
    template,
    score,
    match: Math.max(70, Math.min(98, Math.round(74 + score / Math.max(1, topScore) * 24))),
    reason: reasons.slice(0, 2).join("，") || "与你的简历结构兼容",
  }));
}
