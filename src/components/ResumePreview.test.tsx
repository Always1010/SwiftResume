// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSection } from "../model/resume";
import { ResumeSectionView } from "./ResumePreview";

describe("ResumeSectionView", () => {
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
