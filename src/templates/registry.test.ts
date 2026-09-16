import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATE_IDS } from "../model/resume";
import { RESUME_TEMPLATES, getResumeTemplate } from "./registry";

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
});
