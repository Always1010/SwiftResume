// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDefaultResume, createSection } from "../model/resume";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";

describe("ResumeSectionView", () => {
  it("keeps extended personal details inside the profile header without a basic-info section", () => {
    const html = renderToStaticMarkup(<ResumeProfileView resume={createDefaultResume()} />);
    expect(html).toContain("学历");
    expect(html).toContain("求职状态");
    expect(html).toContain("手机：138 0000 0000");
    expect(html).toContain("邮箱：backend007@example.com");
    expect(html).toContain('<span class="profile-detail-value">本科</span>');
    expect(html).not.toContain("<strong>本科</strong>");
    expect(html).not.toContain("基本信息");
    expect(html).toContain("profile-detail-grid");
  });

  it("renders the configured profile photo background color", () => {
    const resume = createDefaultResume();
    resume.profile.photoBackground = "#D94141";
    const html = renderToStaticMarkup(<ResumeProfileView resume={resume} />);
    expect(html).toContain("background-color:#D94141");
  });

  it("renders a custom module as body-only when all heading fields are blank", () => {
    const section = createSection("content");
    if (section.type !== "content") throw new Error("expected content section");
    section.title = "个人优势";
    section.entries[0].body = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "稳定交付", marks: [{ type: "bold" }] }] }],
    };

    const html = renderToStaticMarkup(<ResumeSectionView section={section} />);
    expect(html).toContain("个人优势");
    expect(html).toContain("<strong>稳定交付</strong>");
    expect(html).not.toContain("entry-topline");
  });

  it("renders title, optional subtitle and date in one heading row", () => {
    const section = createSection("content");
    if (section.type !== "content") throw new Error("expected content section");
    Object.assign(section.entries[0], { title: "开源项目", subtitle: "维护者", date: "2026" });

    const html = renderToStaticMarkup(<ResumeSectionView section={section} />);
    expect(html).toContain("entry-topline");
    expect(html).toContain("开源项目");
    expect(html).toContain("维护者");
    expect(html).toContain("<time>2026</time>");
  });
});
