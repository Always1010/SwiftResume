// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { isApplePlatform, shortcut } from "./keyboardShortcuts";
afterEach(() => vi.restoreAllMocks());
it.each([["Win32", false], ["Linux x86_64", false], ["MacIntel", true]] as const)("uses %s modifier names", (platform, apple) => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  expect(isApplePlatform()).toBe(apple);
  expect(shortcut("Mod+Alt+Shift+Z")).toEqual(apple
    ? { label: "⌘ Cmd + ⌥ Option + Shift + Z", aria: "Meta+Alt+Shift+Z" }
    : { label: "Ctrl + Alt + Shift + Z", aria: "Control+Alt+Shift+Z" });
  expect(shortcut("Mod+P").aria).toBe(apple ? "Meta+P" : "Control+P");
});
