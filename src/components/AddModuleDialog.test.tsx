// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { AddModuleDialog, MODULE_CHOICES } from "./AddModuleDialog";
import { plainText } from "../model/contentLabels";
import { createBlankResume, normalizeResumeDocument, type ResumeSection } from "../model/resume";
vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
it.each(MODULE_CHOICES)("adds %s with editable fictional examples by default", (purpose) => {
  const added = vi.fn<(section: ResumeSection) => void>();
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  act(() => root.render(<AddModuleDialog initialPurpose={purpose} onAdd={added} onClose={() => {}} />));
  expect(document.querySelector('[type="checkbox"]')).toBeNull();
  const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === "添加并编辑")!;
  expect(button.disabled).toBe(false); act(() => button.click());
  const section = added.mock.calls[0][0];
  const text = section.type === "education" ? section.items.map((item) => `${item.school} ${item.detail}`).join("") : section.entries.map((entry) => `${entry.title} ${plainText(entry.body)}`).join("");
  expect(text.length).toBeGreaterThan(20); expect(text).toContain("【示例】");
  expect(text).not.toMatch(/【负责|【背景|【能力|【技能名称|【具体/);
  expect(normalizeResumeDocument({ ...createBlankResume(), sections: [section] })?.sections).toEqual([section]);
  act(() => button.click()); expect(added.mock.calls[1][0].id).not.toBe(section.id);
});
it("cancels without adding or changing any module", () => {
  const added = vi.fn(), close = vi.fn();
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  act(() => root.render(<AddModuleDialog initialPurpose="work" onAdd={added} onClose={close} />));
  act(() => document.querySelector<HTMLButtonElement>('[aria-label="关闭添加模块"]')!.click());
  expect(close).toHaveBeenCalledOnce(); expect(added).not.toHaveBeenCalled();
});
