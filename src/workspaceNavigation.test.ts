// @vitest-environment jsdom
import { expect, it } from "vitest";
import { currentWorkspaceView, navigateWorkspace } from "./workspaceNavigation";
it("uses browser history inside the same document and supports legacy preview addresses", () => {
  window.history.replaceState({}, "", "/?view=preview&resumeId=old");
  expect(currentWorkspaceView()).toBe("preview");
  navigateWorkspace("editor", "old", true);
  expect(currentWorkspaceView()).toBe("editor");
  const length = window.history.length;
  navigateWorkspace("preview", "id with spaces");
  expect(window.history.length).toBe(length + 1);
  expect(new URLSearchParams(window.location.search).get("resumeId")).toBe("id with spaces");
});
