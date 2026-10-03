// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ResumeLibraryDialog, filterResumeSummaries } from "./ResumeLibraryDialog";
import type { ResumeLibrary } from "../storage/resumeStorage";
vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
const library: ResumeLibrary = { version: 1, activeResumeId: "a", resumes: [
  { id: "a", title: "原简历", createdAt: "2026-01-01", updatedAt: "2026-02-01" },
  { id: "b", title: "已有岗位副本", createdAt: "2026-01-01", updatedAt: "2026-03-01" },
] };
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.getAttribute("aria-label") === label || item.textContent === label)!;
async function click(label: string) { await act(async () => button(label).click()); }
function input(element: HTMLInputElement, value: string) { act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); }); }
async function render(rows = library) {
  const props = { library: rows, onClose: vi.fn(), onNew: vi.fn(), onOpen: vi.fn(async () => {}), onRename: vi.fn(async () => {}), onCopy: vi.fn(async () => {}), onDelete: vi.fn(async () => {}), onClear: vi.fn() };
  document.body.innerHTML = '<div id="test"></div>';
  root = createRoot(document.getElementById("test")!);
  await act(async () => root.render(<ResumeLibraryDialog {...props} />));
  return props;
}
it("searches document names without hiding existing job copies", () => {
  expect(filterResumeSummaries(library.resumes, "").map((r) => r.id)).toEqual(["b", "a"]);
  expect(filterResumeSummaries(library.resumes, " 岗位副本 ").map((r) => r.id)).toEqual(["b"]);
  expect(library.resumes[0].id).toBe("a");
});
it("puts New in the heading and document actions in their own rows", async () => {
  await render();
  expect(button("＋ 新建简历").closest("header")).not.toBeNull();
  expect(button("＋ 新建简历").closest(".library-search")).toBeNull();
  expect(document.querySelector(".library-detail")).toBeNull();
  expect(document.querySelectorAll(".library-row")).toHaveLength(2);
  expect(button("创建副本：已有岗位副本").closest(".library-row")?.textContent).toContain("已有岗位副本");
});
it("opens the clicked resume directly and keeps errors visible without closing", async () => {
  const props = await render();
  props.onOpen.mockRejectedValueOnce(new Error("读取失败"));
  await click("打开编辑：已有岗位副本");
  expect(props.onOpen).toHaveBeenCalledWith("b");
  expect(props.onClose).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alert"]')?.textContent).toBe("读取失败");
  await click("继续编辑：原简历");
  expect(props.onOpen).toHaveBeenLastCalledWith("a");
  expect(props.onClose).toHaveBeenCalledOnce();
});
it("copies only its own row without also opening that document", async () => {
  const props = await render();
  await click("创建副本：已有岗位副本");
  expect(props.onCopy).toHaveBeenCalledExactlyOnceWith("b");
  expect(props.onOpen).not.toHaveBeenCalled();
  expect(props.onClose).toHaveBeenCalledOnce();
});
it("renames in the row, supports cancellation and does not mutate on cancel", async () => {
  const props = await render();
  await click("更多操作：已有岗位副本"); await click("重命名");
  input(document.querySelector<HTMLInputElement>(".library-rename input")!, "修改名称");
  await click("取消");
  expect(props.onRename).not.toHaveBeenCalled();
  await click("更多操作：已有岗位副本"); await click("重命名");
  input(document.querySelector<HTMLInputElement>(".library-rename input")!, "新的简历名");
  await act(async () => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(props.onRename).toHaveBeenCalledWith("b", "新的简历名");
  expect(document.querySelector(".library-rename")).toBeNull();
});
it("shows empty search recovery without unrelated backup navigation", async () => {
  await render();
  input(document.querySelector<HTMLInputElement>('[aria-label="搜索简历"]')!, "missing");
  expect(document.body.textContent).toContain("没有找到这份简历");
  expect(document.body.textContent).not.toMatch(/导入与备份|磁盘备份|历史恢复/);
  await click("清除搜索"); expect(document.querySelectorAll(".library-row")).toHaveLength(2);
});
it("prevents deleting the last document and scopes clear to the active resume", async () => {
  const props = await render({ ...library, resumes: [library.resumes[0]] });
  await click("更多操作：原简历");
  expect(button("删除").disabled).toBe(true);
  await click("清空内容，保留结构");
  expect(props.onClear).toHaveBeenCalledOnce();
});
it("ignores repeated requests while an operation is pending", async () => {
  const props = await render();
  let finish!: () => void;
  props.onCopy.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
  await click("创建副本：已有岗位副本");
  expect(button("＋ 新建简历").disabled).toBe(true);
  await click("创建副本：已有岗位副本");
  expect(props.onCopy).toHaveBeenCalledOnce();
  await act(async () => finish());
});
