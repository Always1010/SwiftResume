// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "@tiptap/core";
import { afterEach, expect, it, vi } from "vitest";
import { ContentBodyEditor } from "./ContentBodyEditor";
import { contentRichTextExtensions } from "../../model/contentRichText";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
let editor: Editor;
afterEach(() => { act(() => root?.unmount()); editor?.destroy(); document.body.innerHTML = ""; vi.restoreAllMocks(); });

it.each(["Win32", "MacIntel"])("shows real %s rich-text shortcuts without inventing link or table keys", async (platform) => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<ContentBodyEditor entryId="entry-1" content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Example" }] }] }} onChange={vi.fn()} />));
  const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  expect(button("加粗").title).toContain(platform === "MacIntel" ? "⌘ Cmd + B" : "Ctrl + B");
  expect(button("加粗").getAttribute("aria-keyshortcuts")).toBe(platform === "MacIntel" ? "Meta+B" : "Control+B");
  expect(button("重做").title).toContain(platform === "MacIntel" ? "⌘ Cmd + Shift + Z" : "Ctrl + Y");
  expect(button("无序列表").title).toContain("Shift + 8");
  expect(button("居中").title).toContain("Shift + E");
  for (const label of ["链接", "插入表格", "清除格式", "增加缩进"]) {
    expect(button(label).title).toBe(label);
    expect(button(label).hasAttribute("aria-keyshortcuts")).toBe(false);
  }
});

it.each([
  ["Mod-b", "bold"], ["Mod-i", "italic"], ["Mod-u", "underline"], ["Mod-Shift-s", "strike"],
  ["Mod-Shift-8", "bulletList"], ["Mod-Shift-7", "orderedList"], ["Mod-Shift-b", "blockquote"],
])("the actual rich-text extension handles the advertised %s binding", (keys, format) => {
  editor = new Editor({ extensions: contentRichTextExtensions, content: "<p>Example</p>" });
  editor.commands.setTextSelection({ from: 1, to: 8 });
  editor.commands.keyboardShortcut(keys);
  expect(editor.isActive(format)).toBe(true);
});

it.each([["L", "left"], ["E", "center"], ["R", "right"], ["J", "justify"]])("the actual rich-text extension handles alignment shortcut %s", (key, align) => {
  editor = new Editor({ extensions: contentRichTextExtensions, content: "<p>Example</p>" });
  editor.commands.keyboardShortcut(`Mod-Shift-${key.toLowerCase()}`);
  expect(editor.getAttributes("paragraph").textAlign).toBe(align);
});

it("the actual rich-text extension handles undo and both redo bindings", () => {
  editor = new Editor({ extensions: contentRichTextExtensions, content: "<p>Example</p>" });
  editor.commands.insertContent("Added");
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
  expect(editor.getText()).toBe("Example");
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true, cancelable: true }));
  expect(editor.getText()).toContain("Added");
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
  expect(editor.getText()).toContain("Added");
});
