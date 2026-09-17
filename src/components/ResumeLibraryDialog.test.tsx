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
  { id: "b", title: "岗位版", company: "远山", role: "前端", createdAt: "2026-01-01", updatedAt: "2026-03-01" },
] };
it("searches names and job metadata and orders by last modification", () => {
  expect(filterResumeSummaries(library.resumes, "").map((r) => r.id)).toEqual(["b", "a"]);
  expect(filterResumeSummaries(library.resumes, " 前端 ").map((r) => r.id)).toEqual(["b"]);
  expect(filterResumeSummaries(library.resumes, "远山").map((r) => r.id)).toEqual(["b"]);
  expect(library.resumes[0].id).toBe("a");
});
it("operates on the selected document and keeps the dialog open on failures", async () => {
  const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  const onOpen = vi.fn().mockRejectedValue(new Error("读取失败"));
  const onCopy = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  await act(async () => root.render(<ResumeLibraryDialog library={library} onClose={onClose} onNew={() => {}} onOpen={onOpen} onRename={vi.fn()} onCopy={onCopy} onDelete={vi.fn()} onClear={() => {}} backupTools={<button>备份全部简历</button>} />));
  const click = async (text: string) => {
    const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;
    expect(button).toBeTruthy();
    await act(async () => button.click());
  };
  await click("岗位版");
  await click("打开编辑");
  expect(onOpen).toHaveBeenCalledWith("b");
  expect(onClose).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("读取失败");
  await click("创建副本");
  expect(onCopy).toHaveBeenCalledWith("b");
  expect(onClose).toHaveBeenCalledOnce();
});
