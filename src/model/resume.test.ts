import { describe, expect, it } from "vitest";
import {
  createDefaultResume,
  createBlankResume,
  createSection,
  duplicateSection,
  duplicateResume,
  isResumeDocument,
  moveSection,
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
    expect(richText.type === "custom" && richText.nodes).toEqual([]);
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
});
