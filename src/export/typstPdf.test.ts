import { describe, expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import { createTypstSource } from "./typstPdf";

describe("Typst source generator", () => {
  it("contains active resume modules and selected theme", () => {
    const resume = createDefaultResume();
    const source = createTypstSource(resume);
    expect(source).toContain("教育背景");
    expect(source).toContain("轻量级 HTTP 服务器");
    expect(source).toContain(resume.theme.accent);
  });

  it("applies continuously adjusted density to exported typography", () => {
    const resume = createDefaultResume();
    resume.theme.density = 25;
    const source = createTypstSource(resume);
    expect(source).toContain("size: 8.55pt");
    expect(source).toContain("leading: 0.37em");
    expect(source).toContain("spacing: 5pt");
  });

  it("quotes user content instead of injecting markup", () => {
    const resume = createDefaultResume();
    resume.profile.name = "A\\B\"C";
    expect(createTypstSource(resume)).toContain(JSON.stringify(resume.profile.name));
  });

  it("omits hidden modules", () => {
    const resume = createDefaultResume();
    resume.sections[0].enabled = false;
    expect(createTypstSource(resume)).not.toContain("教育背景");
  });

  it("references a supported profile photo", () => {
    const resume = createDefaultResume();
    resume.profile.photo = "data:image/png;base64,aGVsbG8=";
    expect(createTypstSource(resume)).toContain('image("/profile-photo.png"');
  });

  it("renders structured and rich-text custom modules", () => {
    const resume = createDefaultResume();
    resume.sections.push({
      id: "structured",
      type: "custom",
      title: "开源经历",
      enabled: true,
      editorMode: "document",
      richText: "",
      nodes: [
        { id: "title", type: "title", enabled: true, title: "SwiftResume", subtitle: "维护者", date: "2026" },
        { id: "hidden", type: "paragraph", enabled: false, text: "不应导出" },
      ],
    });
    resume.sections.push({
      id: "richtext",
      type: "custom",
      title: "个人总结",
      enabled: true,
      editorMode: "richtext",
      nodes: [],
      richText: "<p><strong>专注交付</strong></p><ul><li>持续改进</li></ul>",
    });
    const source = createTypstSource(resume);
    expect(source).toContain("SwiftResume");
    expect(source).toContain("专注交付");
    expect(source).toContain("持续改进");
    expect(source).not.toContain("不应导出");
  });
});
