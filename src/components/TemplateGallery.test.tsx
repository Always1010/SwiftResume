// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RESUME_TEMPLATES } from "../templates/registry";
import { createDefaultResume } from "../model/resume";
import { TemplateGallery } from "./TemplateGallery";
import { ResumePreview } from "./ResumePreview";

vi.mock("./ResumePreview", () => ({ ResumePreview: vi.fn(() => null) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("TemplateGallery", () => {
  it("starts with the recommendation flow", () => {
    const html = renderToStaticMarkup(<TemplateGallery selectedId="blueprint" resume={createDefaultResume()} onSelect={() => undefined} />);
    expect(RESUME_TEMPLATES).toHaveLength(100);
    expect(html).toContain("为我推荐");
    expect(html).toContain("你准备投递什么方向");
    expect(html).toContain("15 秒找到适合你的样式");
  });

  it("browses prebuilt images without rendering PDFs, while comparing uses real content", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const resume = createDefaultResume();
    resume.profile.name = "真实简历内容";
    act(() => root!.render(<TemplateGallery selectedId="blueprint" resume={resume} onSelect={() => undefined} />));
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "全部模板")!.click());
    const images = [...container.querySelectorAll(".template-thumbnail-frame img")];
    expect(images).toHaveLength(100);
    expect(images.every((image) => image.getAttribute("src")?.includes("template-previews/") && image.getAttribute("loading") === "lazy")).toBe(true);
    expect(ResumePreview).not.toHaveBeenCalled();
    const toggles = container.querySelectorAll<HTMLButtonElement>(".template-compare-toggle");
    act(() => toggles[0].click());
    act(() => toggles[1].click());
    expect(ResumePreview).not.toHaveBeenCalled();
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "并排对比")!.click());
    expect(ResumePreview).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ResumePreview).mock.calls.every(([props]) => props.resume.profile.name === "真实简历内容")).toBe(true);
  });
});
