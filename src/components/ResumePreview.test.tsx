// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultResume, createSection } from "../model/resume";
import { useTypstPreview } from "../export/useTypstPreview";
import PdfCanvasPreview from "./PdfCanvasPreview";
import { ResumePreview, ResumeProfileView, ResumeSectionView } from "./ResumePreview";

vi.mock("../export/useTypstPreview", () => ({ useTypstPreview: vi.fn() }));
vi.mock("./PdfCanvasPreview", () => ({ default: vi.fn(() => <span data-testid="pdf-preview">PDF</span>) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("ResumePreview page measurements", () => {
  it("keeps the old PDF visible but prevents its page count from being attributed to an updating or failed document", async () => {
    const resume = createDefaultResume();
    const previousBlob = new Blob(["previous"]);
    const preview = { blob: previousBlob, updating: false, error: "", retry: vi.fn() };
    vi.mocked(useTypstPreview).mockReturnValue(preview);
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const oldCount = vi.fn();
    await act(async () => root!.render(<ResumePreview resume={resume} zoom="fit" onPageCountChange={oldCount} />));
    expect(vi.mocked(PdfCanvasPreview).mock.lastCall![0].onPageCountChange).toBe(oldCount);
    const renderedPdf = container.querySelector('[data-testid="pdf-preview"]');

    const updatedResume = { ...resume, profile: { ...resume.profile, name: "新内容" } };
    const currentCount = vi.fn();
    vi.mocked(useTypstPreview).mockReturnValue({ ...preview, updating: true });
    await act(async () => root!.render(<ResumePreview resume={updatedResume} zoom="fit" onPageCountChange={currentCount} />));
    expect(vi.mocked(PdfCanvasPreview).mock.lastCall![0].blob).toBe(previousBlob);
    expect(vi.mocked(PdfCanvasPreview).mock.lastCall![0].onPageCountChange).toBeUndefined();
    expect(container.querySelector('[data-testid="pdf-preview"]')).toBe(renderedPdf);

    vi.mocked(useTypstPreview).mockReturnValue({ ...preview, error: "生成失败" });
    await act(async () => root!.render(<ResumePreview resume={updatedResume} zoom="fit" onPageCountChange={currentCount} />));
    expect(vi.mocked(PdfCanvasPreview).mock.lastCall![0].onPageCountChange).toBeUndefined();
    expect(container.querySelector('[data-testid="pdf-preview"]')).toBe(renderedPdf);

    const currentBlob = new Blob(["current"]);
    vi.mocked(useTypstPreview).mockReturnValue({ ...preview, blob: currentBlob });
    await act(async () => root!.render(<ResumePreview resume={updatedResume} zoom="fit" onPageCountChange={currentCount} />));
    const currentProps = vi.mocked(PdfCanvasPreview).mock.lastCall![0];
    expect(currentProps.blob).toBe(currentBlob);
    expect(currentProps.onPageCountChange).toBe(currentCount);
    act(() => currentProps.onPageCountChange!(3));
    expect(currentCount).toHaveBeenCalledExactlyOnceWith(3);
    expect(oldCount).not.toHaveBeenCalled();
  });
});

describe("ResumeSectionView", () => {
  it("keeps degree beside the major and GPA in the separate right-hand cell", () => {
    const section = createSection("education");
    if (section.type !== "education") throw new Error("expected education");
    Object.assign(section.items[0], { major: "计算机科学与技术", degree: "本科", detail: "GPA 3.7/4.0" });
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ResumeSectionView section={section} />);
    const detail = host.querySelector(".education-detail")!;
    expect(detail.children[0].textContent).toBe("计算机科学与技术 | 本科");
    expect(detail.children[1].textContent).toBe("GPA 3.7/4.0");
  });
  it("keeps extended personal details inside the profile header without a basic-info section", () => {
    const html = renderToStaticMarkup(<ResumeProfileView resume={createDefaultResume()} />);
    expect(html).toContain("学历");
    expect(html).toContain("求职状态");
    expect(html).toContain("手机：138 0000 0000");
    expect(html).toContain("邮箱：backend007@example.com");
    expect(html).toContain("学历：本科");
    expect(html).not.toContain("profile-detail-label");
    expect(html).not.toContain("profile-detail-value");
    expect(html).not.toContain("<strong>本科</strong>");
    expect(html).not.toContain("基本信息");
    expect(html).toContain("profile-info-grid");
  });

  it("formats separate age, gender and location fields without requiring punctuation input", () => {
    const resume = createDefaultResume();
    resume.profile.age = "25岁";
    resume.profile.gender = "女";
    resume.profile.location = "现居: 杭州";
    const html = renderToStaticMarkup(<ResumeProfileView resume={resume} />);
    expect(html).toContain("25岁 · 女");
    expect(html).toContain("现居：杭州");
    expect(html).not.toContain("25岁岁");
    expect(html).not.toContain("现居：现居");
  });

  it("aligns paired details with the contact columns and spans configured full-width details", () => {
    const resume = createDefaultResume();
    resume.profile.details.splice(1, 0, { id: "site", label: "个人网站", value: "example.com" });
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ResumeProfileView resume={resume} />);
    const grid = host.querySelector(".profile-info-grid") as HTMLElement;
    const rows = host.querySelectorAll(".profile-info-row");
    expect(grid.style.gridTemplateColumns).toBe("");
    expect(grid.style.getPropertyValue("--profile-info-columns")).toBe("minmax(0, min(13em, 45%)) minmax(0, 1fr)");
    expect(grid.style.getPropertyValue("--profile-info-column-gap")).toBe("1.9em");
    expect(grid.style.getPropertyValue("--profile-info-row-gap")).toBe("5px");
    expect(rows[0].children[1].textContent).toContain("邮箱：");
    expect(rows[1].children[0].textContent).toBe("学历：本科");
    expect(rows[1].children[1].textContent).toBe("个人网站：example.com");
    expect((rows[2].children[0] as HTMLElement).style.gridColumn).toBe("1 / -1");
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
