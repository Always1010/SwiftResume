// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoBackgroundPicker } from "./PhotoBackgroundPicker";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  document.body.innerHTML = "";
});

describe("PhotoBackgroundPicker", () => {
  it("opens the compact picker and selects a preset color", () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => root.render(<PhotoBackgroundPicker compact value="transparent" onChange={onChange} />));
    act(() => container.querySelector<HTMLButtonElement>(".photo-background-trigger")?.click());
    expect(container.querySelector(".photo-background-popover")).not.toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="红色背景"]')?.click());
    expect(onChange).toHaveBeenCalledWith("#D94141");
    expect(container.querySelector(".photo-background-popover")).toBeNull();
  });
});
