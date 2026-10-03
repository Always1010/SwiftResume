// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceStandalonePreviewEntry } from "./WorkspaceStandalonePreviewEntry";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("keeps the standalone preview and template switcher entry visible and actionable", () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onOpen = vi.fn();

  act(() => root!.render(<WorkspaceStandalonePreviewEntry onOpen={onOpen} />));

  const button = container.querySelector("button")!;
  expect(button.textContent).toBe("模板与预览 ↗");
  expect(button.getAttribute("aria-label")).toBe("打开独立预览并更换简历模板");
  expect(button.classList.contains("workspace-standalone-preview-entry")).toBe(true);
  act(() => button.click());
  expect(onOpen).toHaveBeenCalledOnce();
});
