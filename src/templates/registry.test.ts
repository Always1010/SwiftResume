import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATE_IDS } from "../model/resume";
import { RESUME_TEMPLATES, getResumeTemplate, getResumeTemplatePageClasses } from "./registry";

describe("resume template registry", () => {
  it("registers one hundred unique output templates", () => {
    expect(RESUME_TEMPLATES).toHaveLength(100);
    expect(new Set(RESUME_TEMPLATES.map((template) => template.id)).size).toBe(100);
    expect(RESUME_TEMPLATES.map((template) => template.id)).toEqual(RESUME_TEMPLATE_IDS);
  });

  it("resolves every registered template", () => {
    for (const template of RESUME_TEMPLATES) {
      expect(getResumeTemplate(template.id)).toBe(template);
      expect(RESUME_TEMPLATE_IDS).toContain(template.renderBase);
      expect(template.tags.length).toBeGreaterThan(0);
    }
  });

  it("maps catalog templates to their HTML base layout and visual variant", () => {
    expect(getResumeTemplatePageClasses("consultant")).toBe("resume-template-swiss resume-variant-soft resume-template-consultant");
    expect(getResumeTemplatePageClasses("classic")).toBe("resume-template-classic resume-variant-original resume-template-classic");
  });
});
