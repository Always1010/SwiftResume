// @vitest-environment jsdom
import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RESUME_TEMPLATES } from "../templates/registry";
import { createDefaultResume, type ResumeDocument, type ResumeTemplateId } from "../model/resume";
import { templatePageCountContentKey, type TemplatePageMeasurement } from "../templates/pageMeasurements";
import { TemplateGallery } from "./TemplateGallery";
import { ResumePreview } from "./ResumePreview";

vi.mock("./Modal", () => ({ Modal: ({ children, className }: { children: ReactNode; className?: string }) => <div role="dialog" className={className}>{children}</div> }));
vi.mock("./ResumePreview", () => ({ ResumePreview: vi.fn(() => null) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; window.localStorage.clear(); vi.clearAllMocks(); });

function mountGallery(props: ComponentProps<typeof TemplateGallery>) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<TemplateGallery {...props} />));
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "全部模板")!.click());
  return container;
}

function pageCountLabel(container: HTMLElement, templateId: ResumeTemplateId) {
  const name = RESUME_TEMPLATES.find((template) => template.id === templateId)!.name;
  return container.querySelector(`[aria-label="预览${name}模板"] .template-page-count`)!.textContent;
}

function measured(resume: ResumeDocument, templateId: ResumeTemplateId, pageCount: number): TemplatePageMeasurement {
  return { contentKey: templatePageCountContentKey(resume), templateId, pageCount, engine: "html" };
}

function openComparison(container: HTMLElement) {
  const toggles = container.querySelectorAll<HTMLButtonElement>(".template-compare-toggle");
  act(() => { toggles[0].click(); toggles[1].click(); });
  act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "并排对比")!.click());
}

describe("TemplateGallery", () => {
  it("starts with directly browsable templates and keeps recommendations optional", () => {
    const html = renderToStaticMarkup(<TemplateGallery selectedId="blueprint" resume={createDefaultResume()} onSelect={() => undefined} />);
    expect(RESUME_TEMPLATES).toHaveLength(100);
    expect(html).toContain("为我推荐");
    expect(html).not.toContain("你准备投递什么方向");
    expect(html).toContain("搜索模板");
    expect((html.match(/class="template-gallery-card /g) ?? [])).toHaveLength(100);
  });

  it("browses prebuilt images without rendering PDFs, while comparing uses real content", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const resume = createDefaultResume();
    resume.profile.name = "真实简历内容";
    act(() => root!.render(<TemplateGallery engine="html" selectedId="blueprint" resume={resume} onSelect={() => undefined} />));
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "全部模板")!.click());
    const images = [...container.querySelectorAll(".template-thumbnail-frame img")];
    expect(images).toHaveLength(100);
    expect(images.every((image) => image.getAttribute("src")?.includes("template-previews/") && image.getAttribute("loading") === "lazy")).toBe(true);
    expect(ResumePreview).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".template-page-count")).toHaveLength(100);
    expect([...container.querySelectorAll(".template-page-count")].every((label) => label.textContent === "页数未测")).toBe(true);
    const toggles = container.querySelectorAll<HTMLButtonElement>(".template-compare-toggle");
    act(() => toggles[0].click());
    act(() => toggles[1].click());
    expect(ResumePreview).not.toHaveBeenCalled();
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "并排对比")!.click());
    expect(ResumePreview).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ResumePreview).mock.calls.every(([props]) => props.resume.profile.name === "真实简历内容")).toBe(true);
    expect(vi.mocked(ResumePreview).mock.calls.every(([props]) => props.engine === "html")).toBe(true);
  });

  it("keeps real trial counts across template switches without measuring other cards", () => {
    const resume = createDefaultResume();
    const firstId = RESUME_TEMPLATES[0].id;
    const secondId = RESUME_TEMPLATES[1].id;
    const props = { engine: "html" as const, resume, selectedId: firstId, onSelect: vi.fn() };
    const container = mountGallery({ ...props, pageMeasurement: measured(resume, firstId, 2) });
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 2 页");
    expect(pageCountLabel(container, secondId)).toBe("页数未测");
    const firstButton = container.querySelector<HTMLButtonElement>(".template-gallery-select")!;
    expect(document.getElementById(firstButton.getAttribute("aria-describedby")!)?.textContent).toBe("当前内容实测 2 页");
    // Saving a style selection changes metadata, not the measured content.
    const switched = { ...resume, title: "新标题", updatedAt: "later", theme: { ...resume.theme, templateId: secondId } };
    act(() => root!.render(<TemplateGallery {...props} resume={switched} selectedId={secondId} pageMeasurement={measured(switched, secondId, 3)} />));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 2 页");
    expect(pageCountLabel(container, secondId)).toBe("当前内容实测 3 页");
    expect(ResumePreview).not.toHaveBeenCalled();
  });

  it.each([
    ["profile content", (resume: ResumeDocument) => { resume.profile.name = "更新后的内容"; }],
    ["sections", (resume: ResumeDocument) => { resume.sections[0].enabled = !resume.sections[0].enabled; }],
    ["density", (resume: ResumeDocument) => { resume.theme.density += 1; }],
    ["accent", (resume: ResumeDocument) => { resume.theme.accent = "#112233"; }],
    ["photo", (resume: ResumeDocument) => { resume.profile.photo = "new-photo.png"; }],
    ["photo background", (resume: ResumeDocument) => { resume.profile.photoBackground = "#112233"; }],
    ["photo crop", (resume: ResumeDocument) => { resume.profile.photoCrop.zoom += 1; }],
  ])("invalidates counts after changing %s and ignores an old main-preview result", (_label, change) => {
    const resume = createDefaultResume();
    const templateId = RESUME_TEMPLATES[0].id;
    const props = { engine: "html" as const, resume, selectedId: templateId, onSelect: vi.fn(), pageMeasurement: measured(resume, templateId, 2) };
    const container = mountGallery(props);
    expect(pageCountLabel(container, templateId)).toBe("当前内容实测 2 页");
    const changed = structuredClone(resume);
    change(changed);
    act(() => root!.render(<TemplateGallery {...props} resume={changed} />));
    expect(pageCountLabel(container, templateId)).toBe("页数未测");
    act(() => root!.render(<TemplateGallery {...props} resume={changed} pageMeasurement={measured(changed, templateId, 4)} />));
    expect(pageCountLabel(container, templateId)).toBe("当前内容实测 4 页");
  });

  it("invalidates counts on an output engine change", () => {
    const resume = createDefaultResume();
    const templateId = RESUME_TEMPLATES[0].id;
    const measurement = measured(resume, templateId, 2);
    const props = { resume, selectedId: templateId, onSelect: vi.fn(), pageMeasurement: measurement };
    const container = mountGallery({ ...props, engine: "html" });
    act(() => root!.render(<TemplateGallery {...props} engine="typst" />));
    expect(pageCountLabel(container, templateId)).toBe("页数未测");
    act(() => root!.render(<TemplateGallery {...props} engine="typst" pageMeasurement={{ ...measurement, engine: "typst", pageCount: 3 }} />));
    expect(pageCountLabel(container, templateId)).toBe("当前内容实测 3 页");
  });

  it("does not turn missing, zero, fractional or non-finite results into measured counts", () => {
    const resume = createDefaultResume();
    const templateId = RESUME_TEMPLATES[0].id;
    const props = { engine: "html" as const, resume, selectedId: templateId, onSelect: vi.fn() };
    const container = mountGallery(props);
    for (const pageCount of [0, -1, 1.5, NaN, Infinity]) {
      act(() => root!.render(<TemplateGallery {...props} pageMeasurement={measured(resume, templateId, pageCount)} />));
      expect(pageCountLabel(container, templateId)).toBe("页数未测");
    }
  });

  it("records comparison counts without restarting previews and ignores results from replaced or closed comparisons", () => {
    const resume = createDefaultResume();
    const firstId = RESUME_TEMPLATES[0].id;
    const secondId = RESUME_TEMPLATES[1].id;
    const props = { engine: "html" as const, resume, selectedId: firstId, onSelect: vi.fn() };
    const container = mountGallery(props);
    openComparison(container);
    const first = vi.mocked(ResumePreview).mock.calls[0][0];
    const second = vi.mocked(ResumePreview).mock.calls[1][0];
    act(() => { first.onPageCountChange!(2); second.onPageCountChange!(3); });
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 2 页");
    expect(pageCountLabel(container, secondId)).toBe("当前内容实测 3 页");
    expect(ResumePreview).toHaveBeenCalledTimes(2);
    act(() => first.onPageCountChange!(2));
    expect(ResumePreview).toHaveBeenCalledTimes(2);

    const changed = { ...resume, theme: { ...resume.theme, density: resume.theme.density + 1 } };
    act(() => root!.render(<TemplateGallery {...props} resume={changed} />));
    expect(ResumePreview).toHaveBeenCalledTimes(4);
    act(() => first.onPageCountChange!(9));
    expect(pageCountLabel(container, firstId)).toBe("页数未测");
    const current = vi.mocked(ResumePreview).mock.calls[2][0];
    act(() => current.onPageCountChange!(4));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 4 页");
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="关闭模板对比"]')!.click());
    act(() => current.onPageCountChange!(8));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 4 页");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    act(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "并排对比")!.click());
    expect(ResumePreview).toHaveBeenCalledTimes(6);
    act(() => current.onPageCountChange!(8));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 4 页");
    const reopened = vi.mocked(ResumePreview).mock.calls[4][0];
    act(() => reopened.onPageCountChange!(5));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 5 页");
    act(() => root!.render(<TemplateGallery {...props} resume={changed} engine="typst" />));
    expect(pageCountLabel(container, firstId)).toBe("页数未测");
    act(() => reopened.onPageCountChange!(9));
    expect(pageCountLabel(container, firstId)).toBe("页数未测");
    const newEngine = vi.mocked(ResumePreview).mock.calls[6][0];
    act(() => newEngine.onPageCountChange!(3));
    expect(pageCountLabel(container, firstId)).toBe("当前内容实测 3 页");
  });
});

it("exposes every category in one labelled selector and marks the currently applied template", () => {
  const onSelect = vi.fn();
  const resume = createDefaultResume();
  const selectedId = RESUME_TEMPLATES[0].id;
  const container = mountGallery({ resume, selectedId, onSelect });
  const select = container.querySelector<HTMLSelectElement>('[aria-label="模板分类"]')!;
  expect(select.tagName).toBe("SELECT");
  expect(select.options.length).toBeGreaterThan(5);
  expect(container.querySelectorAll(".template-current-label")).toHaveLength(1);
  expect(container.querySelector(".template-current-label")?.textContent).toBe("当前使用");
  act(() => { select.value = "favorites"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(container.textContent).toContain("还没有收藏模板");
  act(() => [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "查看全部模板")!.click());
  expect(select.value).toBe("all");
  expect(container.querySelectorAll(".template-gallery-card")).toHaveLength(100);
  expect(onSelect).not.toHaveBeenCalled();
});
