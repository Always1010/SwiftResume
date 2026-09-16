import { describe, expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import { recommendTemplates } from "./recommender";

describe("template recommender", () => {
  it("returns six unique ranked templates with explanations", () => {
    const results = recommendTemplates(createDefaultResume(), { scene: "tech", tone: "modern", layout: "single" });
    expect(results).toHaveLength(6);
    expect(new Set(results.map((item) => item.template.id)).size).toBe(6);
    expect(results[0].match).toBeGreaterThanOrEqual(results.at(-1)?.match ?? 0);
    expect(results.every((item) => item.reason.length > 0)).toBe(true);
  });

  it("prefers compact templates for resumes with many entries", () => {
    const resume = createDefaultResume();
    const content = resume.sections.find((section) => section.type === "content");
    if (content?.type === "content") content.entries = Array.from({ length: 12 }, (_, index) => ({ ...content.entries[0], id: `entry-${index}` }));
    const results = recommendTemplates(resume, { scene: "business", tone: "restrained", layout: "structured" });
    expect(results.some((item) => item.template.density === "compact")).toBe(true);
  });
});
