// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { usePdfPrintShortcut } from "./usePdfPrintShortcut";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("routes print shortcuts to the PDF flow and releases the handler on close", () => {
  const open = vi.fn();
  function Probe() { usePdfPrintShortcut(open); return null; }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  for (const modifier of ["ctrlKey", "metaKey"]) {
    const event = new KeyboardEvent("keydown", { key: "p", [modifier]: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  }
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
  expect(open).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
  const event = new KeyboardEvent("keydown", { key: "p", ctrlKey: true, cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});
