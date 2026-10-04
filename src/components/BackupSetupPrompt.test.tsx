// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BackupSetupPrompt } from "./BackupSetupPrompt";
import type { DiskBackupStatus } from "../storage/diskBackup";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
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

it("explains browser-only risk without blocking editing or opening a directory automatically", () => {
  const { container, onChooseDirectory, onAuthorizeDirectory, onLater } = mount("not-configured");
  expect(container.querySelector('aside[aria-label="磁盘备份提醒"]')).not.toBeNull();
  expect(container.querySelector('[aria-modal], [role="dialog"], [role="alertdialog"]')).toBeNull();
  expect(container.textContent).toContain("清理浏览器数据可能丢失简历");
  expect(container.querySelector<HTMLDetailsElement>("details")?.open).toBe(false);
  expect(container.textContent).toContain("本次稍后");
  expect(container.textContent).toContain("下次打开时若仍未配置或授权，会再次提醒");
  expect(onChooseDirectory).not.toHaveBeenCalled();
  expect(onAuthorizeDirectory).not.toHaveBeenCalled();
  act(() => container.querySelector<HTMLButtonElement>(".secondary-button")!.click());
  expect(onChooseDirectory).toHaveBeenCalledOnce();
  act(() => container.querySelector<HTMLButtonElement>(".text-button")!.click());
  expect(onLater).toHaveBeenCalledOnce();
});

it("offers explicit reauthorization for a remembered directory", () => {
  const { container, onChooseDirectory, onAuthorizeDirectory } = mount("permission-required", "简历备份");
  expect(container.textContent).toContain("简历备份");
  act(() => container.querySelector<HTMLButtonElement>(".secondary-button")!.click());
  expect(onAuthorizeDirectory).toHaveBeenCalledOnce();
  expect(onChooseDirectory).not.toHaveBeenCalled();
});

it("describes a generic failure accurately instead of claiming permissions are the cause", () => {
  const { container } = mount("error", "简历备份");
  expect(container.querySelector("strong")?.textContent).toBe("磁盘备份未完成");
  expect(container.textContent).toContain("最近的修改尚未确认备份到磁盘");
});
