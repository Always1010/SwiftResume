// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { openPreviewWindow } from "./openPreviewWindow";

afterEach(() => vi.restoreAllMocks());
it("opens print and preview pages without a parent window association", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  for (const view of ["preview", "html-print"] as const) {
    openPreviewWindow(view, "resume with spaces");
    const [address, target, features] = open.mock.calls.at(-1)!;
    const url = new URL(String(address));
    expect(url.searchParams.get("resumeId")).toBe("resume with spaces");
    expect(url.searchParams.get("view")).toBe(view);
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");
  }
});
