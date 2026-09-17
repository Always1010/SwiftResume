import { describe, expect, it } from "vitest";
import { createDefaultResume, RESUME_TEMPLATE_IDS } from "../model/resume";
import { createTypstSource } from "./typstPdf";

describe("Typst source generator", () => {
  it.each(["minimal", "sidebar", "split", "diplomat"] as const)("does not print content delimiters around the %s profile", (templateId) => {
    const resume = createDefaultResume();
    resume.theme.templateId = templateId;
    resume.sections = [];
    const source = createTypstSource(resume);
    const profileStart = ["minimal", "diplomat"].includes(templateId) ? "#align(center)[" : "#let profile-accent = white\n";
    const profile = source.slice(source.indexOf(profileStart) + profileStart.length);
    expect(profile.trimStart()).toMatch(/^#text\(size: 18pt/);
    expect(source).not.toContain("#align(center)[[");
    expect(source).not.toMatch(/#let profile-accent = white\s*\[/);
    expect(source).toContain(JSON.stringify(resume.profile.name));
    expect(source).toContain("学历：本科");
  });

  it.each(["sidebar", "split"] as const)("evaluates the %s profile photo inside markup", (templateId) => {
    const resume = createDefaultResume();
    resume.theme.templateId = templateId;
    resume.sections = [];
    resume.profile.photoBackground = "";
    let source = createTypstSource(resume);
    expect(source).toContain('[#image("/profile-photo.png"');
    expect(source).not.toContain('[image("/profile-photo.png"');
    resume.profile.photoBackground = "#438EDB";
    source = createTypstSource(resume);
    expect(source).toContain('[#block(width: 27mm, height: 35mm, fill: rgb("#438EDB"), image("/profile-photo.png"');
    expect(source).not.toContain('[block(width: 27mm');
    resume.profile.photo = "";
    source = createTypstSource(resume);
    expect(source).not.toContain('image("/profile-photo.png"');
    expect(source).toContain(JSON.stringify(resume.profile.headline));
  });
  it("reserves full CJK line boxes and lets list spacing follow paragraph leading", () => {
    const source = createTypstSource(createDefaultResume());
    expect(source).toContain("top-edge: 0.88em, bottom-edge: -0.12em");
    expect(source).toContain("#set list(indent: 12pt, body-indent: 4pt, spacing: auto)");
    expect(source).toContain("#set enum(indent: 12pt, body-indent: 4pt, spacing: auto)");
    expect(source).not.toContain("spacing: 1pt");
  });

  it("gives education details a bounded share instead of squeezing the major column", () => {
    const resume = createDefaultResume();
    const education = resume.sections.find((section) => section.type === "education")!;
    if (education.type !== "education") throw new Error("expected education");
    education.items[0].detail = "较长的课程与成绩说明".repeat(20);
    const source = createTypstSource(resume);
    expect(source).toContain("#grid(columns: (2fr, 3fr), column-gutter: 8pt");
    expect(source).toContain(education.items[0].detail);
    expect(source).toContain(education.items[0].major);
  });

  it("contains active resume modules and selected theme", () => {
    const resume = createDefaultResume();
    const source = createTypstSource(resume);
    expect(source).toContain("教育背景");
    expect(source).toContain("银河级高并发陨石订单处理平台");
    expect(source).toContain("开发工具：");
    expect(source).toContain("#list(");
    expect(source).toContain("手机：138 0000 0000");
    expect(source).toContain("邮箱：backend007@example.com");
    expect(source).toContain("学历：本科");
    expect(source).not.toContain("profile-muted");
    expect(source).not.toContain('weight: "medium", fill: profile-ink');
    expect(source).toContain('image("/profile-photo.png"');
    expect(source).toContain(resume.theme.accent);
    expect(source).not.toContain("基本信息");
  });

  it("generates a distinct source marker and layout for all twenty-nine templates", () => {
    const sources = RESUME_TEMPLATE_IDS.map((templateId) => {
      const resume = createDefaultResume();
      resume.theme.templateId = templateId;
      const source = createTypstSource(resume);
      expect(source).toContain(`swift-resume-template: ${templateId}`);
      expect(source).toContain("求职状态");
      expect(source).not.toContain("基本信息");
      return source;
    });
    expect(new Set(sources).size).toBe(RESUME_TEMPLATE_IDS.length);
  });

  it("applies continuously adjusted density to exported typography", () => {
    const resume = createDefaultResume();
    resume.theme.density = 25;
    const source = createTypstSource(resume);
    expect(source).toContain("size: 8.25pt");
    expect(source).toContain("leading: 0.32em");
    expect(source).toContain("spacing: 4.25pt");
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

  it("places a selected solid color behind transparent profile photos", () => {
    const resume = createDefaultResume();
    resume.profile.photoBackground = "#438EDB";
    const source = createTypstSource(resume);
    expect(source).toContain('fill: rgb("#438EDB")');
    expect(source).toContain('image("/profile-photo.png"');
  });

  it("exports optional headings and rich text marks from neutral custom modules", () => {
    const resume = createDefaultResume();
    resume.sections.push({
      id: "custom",
      type: "content",
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

  it("exports advanced rich text formatting and tables", () => {
    const resume = createDefaultResume();
    const project = resume.sections.find((section) => section.title === "项目经历");
    if (!project || project.type !== "content") throw new Error("缺少项目模块");
    project.entries[0].body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { indent: 2, textAlign: "right" },
          content: [{
            type: "text",
            text: "高级格式",
            marks: [{
              type: "textStyle",
              attrs: { fontSize: "14pt", fontWeight: "600", color: "#123456", lineHeight: "1.6" },
            }, { type: "highlight", attrs: { color: "#fff3a3" } }],
          }],
        },
        {
          type: "table",
          content: [{
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "甲" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "乙" }] }] },
            ],
          }],
        },
      ],
    };

    const source = createTypstSource(resume);
    expect(source).toContain("#h(4em)");
    expect(source).toContain("#align(right)");
    expect(source).toContain("size: 14pt");
    expect(source).toContain("weight: 600");
    expect(source).toContain('rgb("#123456")');
    expect(source).toContain('highlight(fill: rgb("#fff3a3"))');
    expect(source).toContain("leading: 0.6em");
    expect(source).toContain("#grid(columns: (1fr, 1fr)");
  });
});
