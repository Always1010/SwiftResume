import background from "../public/background.js?raw";
import { expect, it, vi } from "vitest";
async function fixture(tabs: { id: number; url: string; windowId: number }[]) {
  let click!: () => void;
  const chrome = { runtime: { getURL: () => "chrome-extension://test/index.html" }, action: { onClicked: { addListener: (callback: () => void) => { click = callback; } } }, tabs: { query: vi.fn(async () => tabs), update: vi.fn(), create: vi.fn(async () => undefined) }, windows: { update: vi.fn() } };
  new Function("chrome", background)(chrome);
  click(); click(); await new Promise((resolve) => setTimeout(resolve, 0));
  return chrome;
}
it("focuses the existing app including its preview without navigating away or duplicating it", async () => {
  const chrome = await fixture([{ id: 7, windowId: 1, url: "chrome-extension://test/index.html?view=preview&resumeId=a" }]);
  expect(chrome.tabs.update).toHaveBeenCalledExactlyOnceWith(7, { active: true });
  expect(chrome.windows.update).toHaveBeenCalledWith(1, { focused: true });
  expect(chrome.tabs.create).not.toHaveBeenCalled();
});
it("serializes first launch and leaves old print snapshots untouched", async () => {
  const chrome = await fixture([{ id: 6, windowId: 1, url: "chrome-extension://test/index.html?view=html-print&job=a" }]);
  expect(chrome.tabs.create).toHaveBeenCalledExactlyOnceWith({ url: "chrome-extension://test/index.html" });
  expect(chrome.tabs.update).not.toHaveBeenCalled();
});
