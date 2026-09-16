import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE_PHOTO,
  createBlankResume,
  createDefaultResume,
  createResumeFromTemplate,
  createSection,
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
    expect(resume.profile.photo).toBe(DEFAULT_PROFILE_PHOTO);
    expect(resume.profile.photoSource).toBe(DEFAULT_PROFILE_PHOTO);
    expect(resume.profile.photoBackground).toBe("transparent");
    expect(resume.profile.photoCrop).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
    const education = resume.sections.find((section) => section.title === "教育背景");
    expect(education?.type).toBe("education");
    if (education?.type === "education") {
      expect(education.items[0].school).toBe("X省理工学院");
    }
    const projects = resume.sections.find((section) => section.title === "项目经历");
    expect(projects?.type).toBe("content");
    if (projects?.type === "content") {
      expect(projects.entries).toHaveLength(3);
      expect(projects.entries[0].title).toBe("银河级高并发陨石订单处理平台");
      expect(JSON.stringify(projects.entries[0].body)).toContain("开发工具");
      expect(JSON.stringify(projects.entries[0].body)).toContain("bulletList");
    }
    const work = resume.sections.find((section) => section.title === "工作经历");
    expect(work?.type === "content" && work.entries).toHaveLength(2);
    for (const title of ["专业技能", "个人荣誉", "自我评价"]) {
      const section = resume.sections.find((candidate) => candidate.title === title);
      expect(section?.type).toBe("content");
      if (section?.type === "content") {
        expect(section.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
      }
    }
    const honors = resume.sections.find((section) => section.title === "个人荣誉");
    const evaluation = resume.sections.find((section) => section.title === "自我评价");
    expect(honors?.type === "content" && JSON.stringify(honors.entries[0].body)).toContain("bulletList");
    expect(evaluation?.type === "content" && JSON.stringify(evaluation.entries[0].body)).not.toContain("bulletList");
  });

  it("creates blank documents and independent resume copies", () => {
    const blank = createBlankResume();
    expect(blank.profile.name).toBe("");
    expect(blank.sections).toEqual([]);
    const copy = duplicateResume(createDefaultResume());
    expect(copy.title).toContain("副本");
  });

  it("creates exactly the default example and blank creation templates", () => {
    const example = createResumeFromTemplate("default");
    const blank = createResumeFromTemplate("blank");
    expect(example.title).toBe("搞笑反差示例简历");
    expect(example.profile.name).toBe("林同学（BACKEND-007）");
    expect(JSON.stringify(example)).toContain("银河系第三旋臂深空技术探索有限公司");
    expect(blank.title).toBe("未命名简历");
    expect(blank.profile.name).toBe("");
    expect(blank.sections).toEqual([]);
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

  it("uses only education and generic content sections in the default template", () => {
    const resume = createResumeFromTemplate("default");
    expect(new Set(resume.sections.map((section) => section.type))).toEqual(new Set(["education", "content"]));
    const skills = resume.sections.find((section) => section.title === "专业技能");
    expect(skills?.type).toBe("content");
    if (skills?.type === "content") {
      expect(skills.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
    }
    const honors = resume.sections.find((section) => section.title === "个人荣誉");
    expect(honors?.type).toBe("content");
    if (honors?.type === "content") {
      expect(honors.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
    }
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
    expect(RESUME_TEMPLATE_IDS).toHaveLength(100);
  });

  it("adds non-destructive photo settings to older documents without changing their photo", () => {
    const legacy = createDefaultResume() as unknown as { profile: Record<string, unknown> };
    const originalPhoto = legacy.profile.photo;
    delete legacy.profile.photoSource;
    delete legacy.profile.photoBackground;
    delete legacy.profile.photoCrop;
    const normalized = normalizeResumeDocument(legacy);
    expect(normalized?.profile.photo).toBe(originalPhoto);
    expect(normalized?.profile.photoSource).toBe(originalPhoto);
    expect(normalized?.profile.photoBackground).toBe("transparent");
    expect(normalized?.profile.photoCrop).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
  });

  it("normalizes density values and interpolates layout continuously", () => {
    expect(normalizeDensity("compact")).toBe(0);
    expect(normalizeDensity("standard")).toBe(50);
    expect(normalizeDensity("comfortable")).toBe(100);
    expect(normalizeDensity(140)).toBe(100);
    expect(normalizeDensity(-20)).toBe(0);
    expect(getDensityLayout(25).sectionSpacePx).toBe(10);
    expect(getDensityLayout(75).entrySpacePx).toBe(14.5);
    expect(getDensityLayout(0).bodyLine).toBe(1.22);
    expect(getDensityLayout(100).bodyLine).toBe(1.68);
  });
});
