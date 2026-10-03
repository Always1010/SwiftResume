// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { NewResumeDialog } from "./NewResumeDialog";
import { createResumeFromTemplate } from "../model/resume";
vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes(text))!;
async function render() {
  const onSelect = vi.fn(async () => {}), onClose = vi.fn();
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  await act(async () => root.render(<NewResumeDialog onSelect={onSelect} onClose={onClose} />));
  return { onSelect, onClose };
}
it("offers exactly two useful examples and one blank entry with no redundant choices", () => {
  const html = renderToStaticMarkup(<NewResumeDialog onSelect={() => {}} onClose={() => {}} />);
  expect(html).toContain("应届生 / 实习"); expect(html).toContain("已有工作经验"); expect(html).toContain("空白简历");
  expect(html).not.toMatch(/转行求职|其他演示|搞笑示例演示|从空白开始|放大查看所选示例/);
  expect((html.match(/class="scene-option(?: |")/g) ?? [])).toHaveLength(3);
});
it("creates a genuinely blank document from the blank card", async () => {
  const { onSelect } = await render();
  act(() => button("空白简历").click());
  expect(document.querySelector('[type="checkbox"]')).toBeNull();
  await act(async () => button("创建并编辑").click());
  expect(onSelect).toHaveBeenCalledWith("blank", false);
  const blank = createResumeFromTemplate("blank", false);
  expect(blank.profile.name).toBe(""); expect(blank.sections).toEqual([]);
});
it("preserves optional examples for the other choices without loading full-page previews", async () => {
  const { onSelect } = await render();
  act(() => button("已有工作经验").click());
  expect(document.querySelectorAll(".scene-thumbnail img")).toHaveLength(2);
  expect(document.querySelector(".scene-full-preview")).toBeNull();
  act(() => document.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
  await act(async () => button("创建并编辑").click());
  expect(onSelect).toHaveBeenCalledWith("experienced", false);
});
it("closes with a labeled cross without creating a document", async () => {
  const { onSelect, onClose } = await render();
  act(() => document.querySelector<HTMLButtonElement>('[aria-label="关闭新建简历"]')!.click());
  expect(onClose).toHaveBeenCalledOnce(); expect(onSelect).not.toHaveBeenCalled();
});
it("keeps a failed creation open and allows retry", async () => {
  const { onSelect, onClose } = await render(); onSelect.mockRejectedValueOnce(new Error("存储失败"));
  await act(async () => button("创建并编辑").click());
  expect(document.querySelector('[role="alert"]')?.textContent).toBe("存储失败");
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => button("创建并编辑").click()); expect(onSelect).toHaveBeenCalledTimes(2);
});
it("prevents repeated create and dismissal while saving", async () => {
  const { onSelect, onClose } = await render(); let finish!: () => void;
  onSelect.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
  await act(async () => button("创建并编辑").click());
  expect(button("正在创建").disabled).toBe(true);
  expect(document.querySelector<HTMLButtonElement>('[aria-label="关闭新建简历"]')!.disabled).toBe(true);
  expect(onSelect).toHaveBeenCalledOnce(); expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish());
});
