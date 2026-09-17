// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryActions } from "./HistoryActions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot>;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function renderHistoryActions(undoLabel?: string, redoLabel?: string) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  act(() => root.render(<HistoryActions undoLabel={undoLabel} redoLabel={redoLabel} onUndo={onUndo} onRedo={onRedo} />));
  const buttons = [...container.querySelectorAll("button")];
  return { container, buttons, onUndo, onRedo };
}

describe("HistoryActions", () => {
  it("explains why undo and restore actions are initially unavailable", () => {
    const { container, buttons } = renderHistoryActions();
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("编辑历史");
    expect(buttons.map((button) => button.textContent)).toEqual(["撤销修改", "恢复修改"]);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(buttons[1].getAttribute("aria-label")).toBe("请先撤销一次修改，之后才能恢复");
  });

  it("names the pending changes and invokes the requested history action", () => {
    const { buttons, onUndo, onRedo } = renderHistoryActions("删除模块", "调整简历样式");
    expect(buttons.every((button) => button.disabled)).toBe(false);
    expect(buttons[0].getAttribute("aria-label")).toContain("撤销修改：删除模块");
    expect(buttons[1].getAttribute("aria-label")).toContain("恢复修改：调整简历样式");
    act(() => buttons[0].click());
    act(() => buttons[1].click());
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
  });
});
