// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useHistoryShortcuts } from "./useHistoryShortcuts";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
function mount(canUndo = true, canRedo = true) {
  const onChange = vi.fn();
  function Probe() { useHistoryShortcuts({ canUndo, canRedo, onChange }); return null; }
  root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return onChange;
}
function key(target: EventTarget, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key: "z", bubbles: true, cancelable: true, ...options });
  act(() => { target.dispatchEvent(event); });
  return event;
}
it.each(["ctrlKey", "metaKey"])("supports document undo/redo and outside-field aliases with %s", (modifier) => {
  const change = mount();
  const input = document.createElement("input"); document.body.append(input);
  expect(key(input, { [modifier]: true, altKey: true }).defaultPrevented).toBe(true);
  expect(key(input, { [modifier]: true, altKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  key(window, { [modifier]: true });
  key(window, { [modifier]: true, shiftKey: true });
  key(window, { key: "y", [modifier]: true });
  expect(change.mock.calls.flat()).toEqual(["undo", "redo", "undo", "redo", "redo"]);
});
it("handles macOS Option-modified characters using physical KeyZ", () => {
  const change = mount();
  key(window, { key: "Ω", code: "KeyZ", metaKey: true, altKey: true });
  key(window, { key: "¸", code: "KeyZ", metaKey: true, altKey: true, shiftKey: true });
  expect(change.mock.calls.flat()).toEqual(["undo", "redo"]);
});
it.each(["input", "textarea", "select", "editable", "nested-editable"])("leaves %s native history alone", (kind) => {
  const change = mount();
  const field = document.createElement(kind.includes("editable") ? "div" : kind);
  if (kind.includes("editable")) field.setAttribute("contenteditable", "true");
  document.body.append(field);
  const target = kind === "nested-editable" ? field.appendChild(document.createElement("span")) : field;
  for (const modifier of ["ctrlKey", "metaKey"]) for (const options of [{ key: "z" }, { key: "z", shiftKey: true }, { key: "y" }]) {
    expect(key(target, { ...options, [modifier]: true }).defaultPrevented).toBe(false);
  }
  expect(change).not.toHaveBeenCalled();
});
it("ignores composition, consumed events, unrelated keys and AltGraph typing", () => {
  const change = mount();
  key(window, { ctrlKey: true, isComposing: true });
  key(window, { key: "x", ctrlKey: true });
  key(window, { key: "y", ctrlKey: true, altKey: true });
  key(window, {});
  const consumed = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true }); consumed.preventDefault(); window.dispatchEvent(consumed);
  const altGraph = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, altKey: true });
  vi.spyOn(altGraph, "getModifierState").mockImplementation((key) => key === "AltGraph"); window.dispatchEvent(altGraph);
  expect(change).not.toHaveBeenCalled();
});
it.each(['<dialog open></dialog>', '<div aria-modal="true"></div>'])("does not modify the underlying document during %s", (markup) => {
  const change = mount(); document.body.innerHTML = markup;
  expect(key(window, { ctrlKey: true, altKey: true }).defaultPrevented).toBe(false);
  expect(change).not.toHaveBeenCalled();
});
it("does not dispatch unavailable history and removes the listener on unmount", () => {
  const change = mount(false, false);
  key(window, { ctrlKey: true, altKey: true }); key(window, { ctrlKey: true, altKey: true, shiftKey: true });
  expect(change).not.toHaveBeenCalled();
  act(() => root.unmount());
  expect(key(window, { ctrlKey: true, altKey: true }).defaultPrevented).toBe(false);
});
