import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATE_IDS } from "../model/resume";
import { RESUME_TEMPLATES, getResumeTemplate } from "./registry";

describe("resume template registry", () => {
  it("registers nine unique output templates", () => {
    expect(RESUME_TEMPLATES).toHaveLength(9);
    expect(new Set(RESUME_TEMPLATES.map((template) => template.id)).size).toBe(9);
    expect(RESUME_TEMPLATES.map((template) => template.id)).toEqual(RESUME_TEMPLATE_IDS);
  });

  it("resolves every registered template", () => {
    for (const template of RESUME_TEMPLATES) {
      expect(getResumeTemplate(template.id)).toBe(template);
    }
  });
});
