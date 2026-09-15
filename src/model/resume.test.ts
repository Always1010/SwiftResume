import { describe, expect, it } from "vitest";
import {
  createBlankResume,
  createDefaultResume,
  createSection,
  createStarterResume,
  duplicateResume,
  duplicateSection,
  getDensityLayout,
  isResumeDocument,
  moveSection,
  normalizeDensity,
  normalizeResumeDocument,
  RESUME_TEMPLATE_IDS,
  reorderSection,
} from "./resume";

describe("resume model", () => {
  it("creates a schema v3 resume with three semantic component types", () => {
    const resume = createDefaultResume();
    expect(isResumeDocument(resume)).toBe(true);
    expect(resume.schemaVersion).toBe(3);
    expect(resume.theme.templateId).toBe("classic");
    const projects = resume.sections.find((section) => section.title === "项目经历");
    expect(projects?.type).toBe("content");
    if (projects?.type === "content") {
      expect(projects.entries[0].title).toBe("轻量级 HTTP 服务器");
      expect(JSON.stringify(projects.entries[0].body)).toContain("开发工具");
      expect(JSON.stringify(projects.entries[0].body)).toContain("bulletList");
    }
  });

  it("creates blank documents and independent resume copies", () => {
    const blank = createBlankResume();
    expect(blank.profile.name).toBe("");
    expect(blank.sections).toEqual([]);
    const copy = duplicateResume(createDefaultResume());
    expect(copy.title).toContain("副本");
  });

  it("creates a content-free starter resume with a complete module structure", () => {
    const starter = createStarterResume();
    expect(starter.profile.name).toBe("");
    expect(starter.sections.map((section) => section.title)).toEqual([
      "求职意向",
      "工作经历",
      "项目经历",
      "教育背景",
      "专业技能",
      "自我评价",
    ]);
    expect(JSON.stringify(starter)).not.toContain("某某大学");
    expect(JSON.stringify(starter)).not.toContain("轻量级 HTTP 服务器");
  });

  it("creates one neutral content entry for every custom module", () => {
    const section = createSection("content");
    expect(section.type).toBe("content");
    if (section.type === "content") {
      expect(section.title).toBe("自定义模块");
      expect(section.entries).toHaveLength(1);
      expect(section.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
      expect(section.entries[0].body).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    }
  });

  it("duplicates content modules without sharing entry identities", () => {
    const section = createSection("content");
    const copy = duplicateSection(section);
    expect(copy.id).not.toBe(section.id);
    expect(copy.type).toBe("content");
    if (copy.type === "content" && section.type === "content") {
      expect(copy.entries[0].id).not.toBe(section.entries[0].id);
    }
  });

  it("uses only education and generic content sections in starter documents", () => {
    const starter = createStarterResume();
    expect(new Set(starter.sections.map((section) => section.type))).toEqual(new Set(["education", "content"]));
    const skills = starter.sections.find((section) => section.title === "专业技能");
    expect(skills?.type).toBe("content");
    if (skills?.type === "content") {
      expect(skills.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
    }
    expect(starter.sections.some((section) => section.title === "个人荣誉")).toBe(false);
  });

  it("moves and drags sections without mutating the input", () => {
    const sections = createDefaultResume().sections;
    const moved = moveSection(sections, sections[0].id, 1);
    expect(moved[1].id).toBe(sections[0].id);
    expect(sections[0].id).not.toBe(moved[0].id);
    const reordered = reorderSection(sections, sections[0].id, sections[2].id);
    expect(reordered[2].id).toBe(sections[0].id);
  });

  it("rejects obsolete schema v2 documents instead of migrating them", () => {
    const obsolete = { ...createDefaultResume(), schemaVersion: 2 };
    expect(normalizeResumeDocument(obsolete)).toBeNull();
  });

  it("normalizes missing or unknown template ids to the classic template", () => {
    const resume = createDefaultResume() as unknown as { theme: { templateId?: string } };
    delete resume.theme.templateId;
    expect(normalizeResumeDocument(resume)?.theme.templateId).toBe("classic");
    resume.theme.templateId = "unknown";
    expect(normalizeResumeDocument(resume)?.theme.templateId).toBe("classic");
    expect(RESUME_TEMPLATE_IDS).toHaveLength(29);
  });

  it("normalizes density values and interpolates layout continuously", () => {
    expect(normalizeDensity("compact")).toBe(0);
    expect(normalizeDensity("standard")).toBe(50);
    expect(normalizeDensity("comfortable")).toBe(100);
    expect(normalizeDensity(140)).toBe(100);
    expect(normalizeDensity(-20)).toBe(0);
    expect(getDensityLayout(25).sectionSpacePx).toBe(12);
    expect(getDensityLayout(75).entrySpacePx).toBe(11.5);
  });
});
