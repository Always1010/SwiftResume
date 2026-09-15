import { describe, expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import { createTypstSource } from "./typstPdf";

describe("Typst source generator", () => {
  it("contains active resume modules and selected theme", () => {
    const resume = createDefaultResume();
    const source = createTypstSource(resume);
    expect(source).toContain("教育背景");
    expect(source).toContain("轻量级 HTTP 服务器");
    expect(source).toContain("开发工具：");
    expect(source).toContain("#list(");
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

  it("exports optional headings and rich text marks from neutral custom modules", () => {
    const resume = createDefaultResume();
    resume.sections.push({
      id: "custom",
      type: "custom",
      title: "个人优势",
      enabled: true,
      entries: [
        {
          id: "body-only",
          title: "",
          subtitle: "",
          date: "",
          body: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "持续交付", marks: [{ type: "bold" }] }] }],
          },
        },
        {
          id: "with-heading",
          title: "开源项目",
          subtitle: "维护者",
          date: "2026",
          body: {
            type: "doc",
            content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "稳定维护" }] }] }] }],
          },
        },
      ],
    });
    const source = createTypstSource(resume);
    expect(source).toContain("个人优势");
    expect(source).toContain("#strong[#text(\"持续交付\")]");
    expect(source).toContain("开源项目");
    expect(source).toContain("维护者");
    expect(source).toContain("2026");
    expect(source).toContain("稳定维护");
  });
});
