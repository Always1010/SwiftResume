// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackupSetupPrompt } from "./BackupSetupPrompt";
import type { DiskBackupStatus } from "../storage/diskBackup";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; this.querySelector<HTMLButtonElement>("button")?.focus(); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
});
afterEach(() => { act(() => root?.unmount()); root = undefined; document.body.innerHTML = ""; });

function mount(status: DiskBackupStatus, directoryName = "") {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onChooseDirectory = vi.fn();
  const onAuthorizeDirectory = vi.fn();
  const onLater = vi.fn();
  act(() => root!.render(<BackupSetupPrompt status={status} directoryName={directoryName} onChooseDirectory={onChooseDirectory} onAuthorizeDirectory={onAuthorizeDirectory} onLater={onLater} />));
  return { container, onChooseDirectory, onAuthorizeDirectory, onLater };
}

it("shows an accessible native modal without opening a directory automatically", async () => {
  const { container, onChooseDirectory, onAuthorizeDirectory, onLater } = mount("not-configured");
  const dialog = container.querySelector("dialog")!;
  expect(dialog.open).toBe(true);
  expect(dialog.getAttribute("aria-labelledby")).toBe("backup-prompt-title");
  expect(dialog.getAttribute("aria-describedby")).toBe("backup-prompt-description");
  expect(container.textContent).toContain("清理浏览器数据或卸载扩展可能丢失简历");
  expect(container.textContent).toContain("本次稍后");
  expect(container.textContent).toContain("下次打开时会重新检查");
  expect(onChooseDirectory).not.toHaveBeenCalled();
  expect(onAuthorizeDirectory).not.toHaveBeenCalled();
  await act(async () => { container.querySelector<HTMLButtonElement>(".primary-button")!.click(); });
  expect(onChooseDirectory).toHaveBeenCalledOnce();
  act(() => container.querySelector<HTMLButtonElement>(".secondary-button")!.click());
  expect(onLater).toHaveBeenCalledOnce();
});

it("offers explicit reauthorization for a remembered directory", async () => {
  const { container, onChooseDirectory, onAuthorizeDirectory } = mount("permission-required", "简历备份");
  expect(container.textContent).toContain("简历备份");
  await act(async () => { container.querySelector<HTMLButtonElement>(".primary-button")!.click(); });
  expect(onAuthorizeDirectory).toHaveBeenCalledOnce();
  expect(onChooseDirectory).not.toHaveBeenCalled();
});

it("describes a generic failure accurately instead of claiming permissions are the cause", () => {
  const { container } = mount("error", "简历备份");
  expect(container.querySelector("h2")?.textContent).toBe("磁盘备份未完成");
  expect(container.textContent).toContain("最近的修改尚未确认备份到磁盘");
});

it("prevents repeated selection and dismissal while a directory action is in progress", async () => {
  const { container, onChooseDirectory, onLater } = mount("not-configured");
  let finish!: () => void;
  onChooseDirectory.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  const choose = container.querySelector<HTMLButtonElement>(".primary-button")!;
  act(() => { choose.click(); choose.click(); });
  expect(onChooseDirectory).toHaveBeenCalledOnce();
  expect(choose.disabled).toBe(true);
  act(() => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })));
  expect(onLater).not.toHaveBeenCalled();
  await act(async () => { finish(); });
  expect(choose.disabled).toBe(false);
});

it("restores the previous editing focus when the reminder closes", () => {
  const origin = document.createElement("button");
  document.body.append(origin); origin.focus();
  const focus = vi.spyOn(origin, "focus");
  mount("not-configured");
  act(() => root!.unmount()); root = undefined;
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
