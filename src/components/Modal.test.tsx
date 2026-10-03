// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; vi.restoreAllMocks(); });
it("uses native modal behavior, exposes a named cross and restores prior focus without scrolling", () => {
  document.body.innerHTML = '<button id="origin">打开</button><div id="test"></div>';
  const origin = document.getElementById("origin")!; origin.focus();
  const focus = vi.spyOn(origin, "focus"); const close = vi.fn();
  root = createRoot(document.getElementById("test")!);
  act(() => root.render(<Modal titleId="title" onClose={close}><h2 id="title">测试</h2><CloseButton label="关闭测试" onClick={close} /></Modal>));
  const dialog = document.querySelector("dialog")!;
  expect(dialog.open).toBe(true);
  expect(dialog.id).toBe("title-dialog");
  const cross = document.querySelector<HTMLButtonElement>('[aria-label="关闭测试"]')!;
  expect(cross.title).toBe("关闭测试"); expect(cross.textContent).toBe("×");
  act(() => cross.click()); expect(close).toHaveBeenCalledOnce();
  const cancel = new Event("cancel", { cancelable: true }); act(() => dialog.dispatchEvent(cancel));
  expect(cancel.defaultPrevented).toBe(true); expect(close).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
