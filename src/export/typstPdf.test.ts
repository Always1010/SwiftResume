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

  it("renders builder, document and rich-text custom modules independently", () => {
    const resume = createDefaultResume();
    resume.sections.push({
      id: "structured",
      type: "custom",
      title: "开源经历",
      enabled: true,
      editorMode: "builder",
      richText: "",
      documentBlocks: [],
      hiddenDocumentBlockIds: [],
      nodes: [
        { id: "title", type: "title", enabled: true, title: "SwiftResume", subtitle: "维护者", date: "2026", styles: { title: { fontSize: 14, fontWeight: 700, color: "#123456" } } },
        { id: "hidden", type: "paragraph", enabled: false, text: "不应导出" },
      ],
    });
    resume.sections.push({
      id: "document",
      type: "custom",
      title: "自由文档",
      enabled: true,
      editorMode: "document",
      richText: "",
      nodes: [],
      documentBlocks: [
        { id: "visible-block", type: "heading", props: { level: 2, textAlignment: "center" }, content: [{ type: "text", text: "块编辑内容", styles: { bold: true, fontSize: "14pt" } }] },
        { id: "hidden-block", type: "paragraph", content: "隐藏块" },
      ],
      hiddenDocumentBlockIds: ["hidden-block"],
    });
    resume.sections.push({
      id: "richtext",
      type: "custom",
      title: "个人总结",
      enabled: true,
      editorMode: "richtext",
      nodes: [],
      documentBlocks: [],
      hiddenDocumentBlockIds: [],
      richText: '<h2><span style="font-size: 14pt; font-weight: 700">专注交付</span></h2><ul><li>持续改进</li></ul>',
    });
    const source = createTypstSource(resume);
    expect(source).toContain("SwiftResume");
    expect(source).toContain("块编辑内容");
    expect(source).toContain("专注交付");
    expect(source).toContain("持续改进");
    expect(source).toContain("size: 14pt");
    expect(source).toContain("#align(center)");
    expect(source).toContain('rgb("#123456")');
    expect(source).not.toContain("不应导出");
    expect(source).not.toContain("隐藏块");
  });
});
