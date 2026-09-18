// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { commitHtmlPages } from "./htmlPreviewUpdates";

afterEach(() => { document.body.innerHTML = ""; vi.unstubAllGlobals(); });
it("retains unchanged page text nodes and scroll position while updating changed pages", () => {
  document.body.innerHTML = '<div class="html-canvas-preview"><div id="visible"><div><div><p>第一页</p></div></div><div><div><p>旧文字</p></div></div></div></div><div id="measure"><div style="font-size:12px"><div><p>第一页</p></div></div><div><div><p>新文字</p></div></div><div><div><p>第三页</p></div></div></div>';
  const visible = document.getElementById("visible")!;
  const first = visible.querySelector("p")!;
  const secondPage = visible.children[1];
  const viewport = visible.parentElement!;
  viewport.scrollTop = 300;
  viewport.scrollLeft = 70;
  commitHtmlPages(document.getElementById("measure")!, visible);
  expect(visible.querySelector("p")).toBe(first);
  expect(visible.children[1]).toBe(secondPage);
  expect(visible.textContent).toBe("第一页新文字第三页");
  expect((visible.firstElementChild as HTMLElement).style.fontSize).toBe("12px");
  expect(viewport.scrollTop).toBe(300);
  expect(viewport.scrollLeft).toBe(70);
  document.getElementById("measure")!.lastElementChild!.remove();
  commitHtmlPages(document.getElementById("measure")!, visible);
  expect(visible.children.length).toBe(2);
  expect(visible.querySelector("p")).toBe(first);
});
it("loads shared fonts once and permits retry after a failure", async () => {
  vi.resetModules();
  const load = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue([]);
  Object.defineProperty(document, "fonts", { configurable: true, value: { load, ready: Promise.resolve() } });
  const { prepareHtmlFonts } = await import("./htmlPreviewUpdates");
  const first = prepareHtmlFonts();
  expect(prepareHtmlFonts()).toBe(first);
  await expect(first).rejects.toThrow("network");
  await prepareHtmlFonts();
  expect(prepareHtmlFonts()).toBeUndefined();
  expect(load).toHaveBeenCalledTimes(4);
});
