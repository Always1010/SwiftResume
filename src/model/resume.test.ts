import { describe, expect, it } from "vitest";
import {
  createDefaultResume,
  createBlankResume,
  createStarterResume,
  createSection,
  duplicateSection,
  duplicateResume,
  isResumeDocument,
  moveSection,
  getDensityLayout,
  normalizeDensity,
  normalizeResumeDocument,
  reorderSection,
} from "./resume";

describe("resume model", () => {
  it("creates a usable default document", () => {
    const resume = createDefaultResume();
    expect(isResumeDocument(resume)).toBe(true);
    expect(resume.sections.length).toBeGreaterThan(2);
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
    expect(starter.sections.map((section) => section.type)).toEqual([
      "custom",
      "experience",
      "projects",
      "education",
      "skills",
      "custom",
    ]);
    expect(JSON.stringify(starter)).not.toContain("某某大学");
    expect(JSON.stringify(starter)).not.toContain("轻量级 HTTP 服务器");
  });

  it("creates and duplicates independent modules", () => {
    const section = createSection("projects");
    const copy = duplicateSection(section);
    expect(copy.id).not.toBe(section.id);
    expect(copy.type).toBe("projects");
    if (copy.type === "projects" && section.type === "projects") {
      expect(copy.items[0].id).not.toBe(section.items[0].id);
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

  it("creates three compatible custom module modes", () => {
    const builder = createSection("custom", "builder");
    const document = createSection("custom", "document");
    const richText = createSection("custom", "richtext");
    expect(builder.type === "custom" && builder.editorMode).toBe("builder");
    expect(document.type === "custom" && document.editorMode).toBe("document");
    expect(richText.type === "custom" && richText.editorMode).toBe("richtext");
    if (builder.type === "custom" && document.type === "custom" && richText.type === "custom") {
      expect(builder.nodes).toHaveLength(1);
      expect(builder.documentBlocks).toEqual([]);
      expect(builder.richText).toBe("");
      expect(document.nodes).toEqual([]);
      expect(document.documentBlocks).toEqual([{ type: "paragraph", content: "" }]);
      expect(document.richText).toBe("");
      expect(richText.nodes).toEqual([]);
      expect(richText.documentBlocks).toEqual([]);
      expect(richText.richText).toBe("<p><br></p>");
    }
  });

  it("migrates the old document view into independent document blocks", () => {
    const resume = createDefaultResume();
    const legacyDocument = createSection("custom", "builder");
    if (legacyDocument.type !== "custom") throw new Error("expected custom section");
    legacyDocument.editorMode = "document";
    legacyDocument.nodes = [
      { id: "title", type: "title", enabled: true, title: "开源项目", subtitle: "维护者", date: "2026" },
      { id: "hidden", type: "paragraph", enabled: false, text: "内部备注" },
    ];
    delete (legacyDocument as Partial<typeof legacyDocument>).documentBlocks;
    delete (legacyDocument as Partial<typeof legacyDocument>).hiddenDocumentBlockIds;
    resume.sections.push(legacyDocument);

    const migrated = normalizeResumeDocument(resume)?.sections.at(-1);
    expect(migrated?.type).toBe("custom");
    if (migrated?.type === "custom") {
      expect(migrated.documentBlocks).toHaveLength(2);
      expect(migrated.hiddenDocumentBlockIds).toEqual(["hidden"]);
      expect(migrated.nodes).toHaveLength(2);
    }
  });

  it("migrates legacy custom modules without dropping content", () => {
    const resume = createDefaultResume();
    resume.sections.push({
      id: "legacy",
      type: "custom",
      title: "开源经历",
      enabled: true,
      items: [{
        id: "item",
        title: "SwiftResume",
        subtitle: "维护者",
        date: "2026",
        description: "浏览器端简历工具",
        bullets: ["支持自由模块"],
      }],
    } as never);
    const migrated = normalizeResumeDocument(resume);
    const custom = migrated?.sections.at(-1);
    expect(custom?.type).toBe("custom");
    if (custom?.type === "custom") {
      expect(custom.editorMode).toBe("builder");
      expect(custom.nodes.map((node) => node.type)).toEqual(["title", "paragraph", "bullets"]);
    }
  });

  it("migrates legacy density values and clamps numeric values", () => {
    expect(normalizeDensity("compact")).toBe(0);
    expect(normalizeDensity("standard")).toBe(50);
    expect(normalizeDensity("comfortable")).toBe(100);
    expect(normalizeDensity(140)).toBe(100);
    expect(normalizeDensity(-20)).toBe(0);

    const resume = createDefaultResume();
    resume.theme.density = "comfortable" as never;
    expect(normalizeResumeDocument(resume)?.theme.density).toBe(100);
  });

  it("interpolates density layout continuously", () => {
    expect(getDensityLayout(25).sectionSpacePx).toBe(12);
    expect(getDensityLayout(75).entrySpacePx).toBe(11.5);
  });
});
