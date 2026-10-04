// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { PreviewZoom } from "../settings/appSettings";
import { PreviewZoomControls } from "./PreviewZoomControls";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
const change = vi.fn();
function Harness({ initial = "fit" }: { initial?: PreviewZoom }) {
  const [zoom, setZoom] = useState(initial);
  return <PreviewZoomControls zoom={zoom} onChange={(next) => { change(next); setZoom(next); }} />;
}
function mount(initial: PreviewZoom = "fit") { const host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root.render(<Harness initial={initial} />)); }
const field = () => document.querySelector<HTMLInputElement>('input[aria-label="预览缩放百分比"]')!;
function type(value: string) { act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(field(),value); field().dispatchEvent(new Event("input",{bubbles:true})); }); }
function key(value: string, isComposing = false) { act(() => field().dispatchEvent(new KeyboardEvent("keydown",{key:value,bubbles:true,cancelable:true,isComposing}))); }
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML=""; change.mockClear(); });
it("has one accessible number control and explicitly distinguishes automatic fit", () => {
  mount(); expect(field().type).toBe("number"); expect(field().min).toBe("50"); expect(field().max).toBe("140"); expect(field().value).toBe(""); expect(field().placeholder).toBe("自动");
  expect(document.querySelector('[aria-pressed="true"]')?.textContent).toBe("适应宽度");
  type("115"); expect(change).not.toHaveBeenCalled(); key("Enter"); expect(change).toHaveBeenLastCalledWith(115); expect(field().value).toBe("115");
  act(() => document.querySelector<HTMLButtonElement>('[aria-pressed="false"]')!.click());
  expect(change).toHaveBeenLastCalledWith("fit"); expect(field().value).toBe("");
});
it.each([["20",50],["200",140],["87.4",87]])("normalizes %s on blur without changing partially typed values", (raw,expected) => {
  mount(100); type(raw); expect(change).not.toHaveBeenCalled(); act(() => field().dispatchEvent(new FocusEvent("focusout",{bubbles:true}))); expect(change).toHaveBeenLastCalledWith(expected); expect(field().value).toBe(String(expected));
});
it("restores empty or invalid input and cancels an edit with Escape", () => {
  mount(90); type(""); key("Enter"); expect(field().value).toBe("90"); type("not a number"); key("Enter"); expect(field().value).toBe("90");
  type("120"); key("Escape"); expect(field().value).toBe("90"); expect(change).not.toHaveBeenCalled();
});
it("does not commit IME confirmation and supports one-percent keyboard steps", () => {
  mount(100); type("125"); key("Enter",true); expect(change).not.toHaveBeenCalled(); key("Enter"); expect(change).toHaveBeenLastCalledWith(125);
  key("ArrowUp"); expect(change).toHaveBeenLastCalledWith(126); key("ArrowDown"); expect(change).toHaveBeenLastCalledWith(125);
});
it("clamps step buttons and disables them at the shared limits", () => {
  mount(140); expect(document.querySelector<HTMLButtonElement>('[aria-label="放大预览"]')!.disabled).toBe(true);
  act(() => document.querySelector<HTMLButtonElement>('[aria-label="缩小预览"]')!.click()); expect(change).toHaveBeenLastCalledWith(130);
  type("50"); key("Enter"); expect(document.querySelector<HTMLButtonElement>('[aria-label="缩小预览"]')!.disabled).toBe(true);
});
