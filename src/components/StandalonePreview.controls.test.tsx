// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDefaultResume } from "../model/resume";
import { StandalonePreview } from "./StandalonePreview";
vi.mock("./ResumePreview", () => ({ ResumePreview: () => <div>输出预览</div> }));
vi.mock("./TemplateGallery", () => ({ TemplateGallery: () => <aside>模板列表</aside> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; vi.unstubAllGlobals(); });
it("keeps display controls beside the preview and appearance options closed until requested", () => {
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  const onAppearanceChange = vi.fn(); const onExport = vi.fn(); const onBack = vi.fn();
  const resume = createDefaultResume();
  const original = JSON.stringify(resume);
  act(() => root.render(<StandalonePreview resume={resume} engine="html" saveState="saved" onAppearanceChange={onAppearanceChange} onExport={onExport} onBack={onBack} />));
  expect(document.querySelector(".standalone-preview-toolbar .standalone-zoom-control")).toBeNull();
  expect(document.querySelector(".standalone-appearance-bar .standalone-zoom-control")).not.toBeNull();
  const disclosure = document.querySelector<HTMLDetailsElement>(".standalone-appearance-options")!;
  expect(disclosure.open).toBe(false);
  act(() => document.querySelector<HTMLButtonElement>('[aria-label="放大预览"]')!.click());
  expect(document.querySelector(".standalone-zoom-control output")?.textContent).toBe("110%");
  expect(onAppearanceChange).not.toHaveBeenCalled();
  act(() => { disclosure.open = true; });
  const density = document.querySelector<HTMLInputElement>('[aria-label="模板预览排版密度"]')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(density, "60"); density.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(onAppearanceChange).toHaveBeenCalledWith({ theme: { density: 60 } });
  act(() => [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "打印 / 保存 PDF")!.click());
  expect(onExport).toHaveBeenCalledOnce();
  expect(JSON.stringify(resume)).toBe(original);
});

it("puts the return action first beside the preview heading and keeps export on the right", () => {
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  const onBack = vi.fn();
  act(() => root.render(<StandalonePreview resume={createDefaultResume()} engine="html" saveState="saved" onAppearanceChange={vi.fn()} onExport={vi.fn()} onBack={onBack} />));
  const header = document.querySelector(".standalone-preview-toolbar")!;
  const back = header.querySelector<HTMLButtonElement>("button")!;
  expect(back.textContent).toBe("返回编辑");
  expect(back.parentElement).toBe(header.querySelector(".standalone-preview-leading"));
  expect(back.nextElementSibling?.textContent).toContain("模板与预览");
  expect(header.querySelector(".standalone-preview-actions")?.textContent).not.toContain("返回编辑");
  expect(header.querySelector(".standalone-preview-actions")?.textContent).toContain("打印 / 保存 PDF");
  act(() => back.click());
  expect(onBack).toHaveBeenCalledOnce();
});
