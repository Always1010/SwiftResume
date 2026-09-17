// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SCENARIOS } from "../model/contentPresets";
import { scenarioPreviewPages } from "../templates/staticPreviews";
import { NewResumeDialog } from "./NewResumeDialog";
import { ResumePreview } from "./ResumePreview";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./ResumePreview", () => ({ ResumePreview: vi.fn(() => null) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("NewResumeDialog", () => {
  it("offers three career starting points alongside demonstration and blank options", () => {
    const html = renderToStaticMarkup(<NewResumeDialog onSelect={() => undefined} onClose={() => undefined} />);
    expect(html).toContain("应届生 / 实习");
    expect(html).toContain("已有工作经验");
    expect(html).toContain("转行求职");
    expect(html).toContain("搞笑示例演示");
    expect(html).toContain("从空白开始");
    expect(html).toContain("放大查看所选示例");
    expect((html.match(/class="scene-option(?: |")/g) ?? [])).toHaveLength(3);
  });

  it("switches complete static page sets without mounting a PDF renderer", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const select = vi.fn();
    act(() => root!.render(<NewResumeDialog onSelect={select} onClose={() => undefined} />));
    expect(container.querySelectorAll(".scene-thumbnail img")).toHaveLength(3);
    for (const [index, scene] of SCENARIOS.entries()) {
      act(() => container.querySelectorAll<HTMLButtonElement>(".scene-option")[index].click());
      act(() => container.querySelector(".scene-full-preview summary")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      const images = [...container.querySelectorAll(".static-scenario-pages img")];
      expect(images.map((image) => image.getAttribute("src"))).toEqual(scenarioPreviewPages(scene.id).map((page) => page.src));
      expect(images.every((image, page) => image.getAttribute("alt")?.includes(`第 ${page + 1} 页`))).toBe(true);
    }
    expect(ResumePreview).not.toHaveBeenCalled();
    act(() => container.querySelector<HTMLButtonElement>(".scene-footer .primary-button")!.click());
    expect(select).toHaveBeenCalledWith("career-change", true);
  });
});
