import { describe, expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import {
  MAX_TEMPLATE_GALLERY_WIDTH,
  MIN_TEMPLATE_GALLERY_WIDTH,
  clampTemplateGalleryWidth,
  updateResumeAppearance,
} from "./StandalonePreview";

describe("StandalonePreview appearance updates", () => {
  it("updates all shared appearance values without mutating resume content", () => {
    const resume = createDefaultResume();
    const sections = resume.sections;
    const next = updateResumeAppearance(resume, {
      theme: { templateId: "minimal", density: 72, accent: "#123456" },
      photoBackground: "#D94141",
    }, "2026-09-16T12:00:00.000Z");

    expect(next.theme).toMatchObject({ templateId: "minimal", density: 72, accent: "#123456" });
    expect(next.profile.photoBackground).toBe("#D94141");
    expect(next.sections).toBe(sections);
    expect(resume.profile.photoBackground).not.toBe("#D94141");
    expect(next.updatedAt).toBe("2026-09-16T12:00:00.000Z");
  });
});

describe("template gallery width", () => {
  it("supports a wide 860px gallery while respecting the available workspace", () => {
    expect(clampTemplateGalleryWidth(100)).toBe(MIN_TEMPLATE_GALLERY_WIDTH);
    expect(clampTemplateGalleryWidth(700)).toBe(700);
    expect(clampTemplateGalleryWidth(1000)).toBe(MAX_TEMPLATE_GALLERY_WIDTH);
    expect(clampTemplateGalleryWidth(800, 640)).toBe(640);
  });
});
