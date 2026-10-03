// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { createBlankResume } from "../model/resume";
import { readWorkspaceDraft, saveWorkspaceDraft } from "./workspaceDraft";
afterEach(() => sessionStorage.clear());
it("recovers a newer unsaved draft only for the matching document", () => {
  const saved = createBlankResume(); saved.updatedAt = "2026-01-01T00:00:00Z";
  const resume = { ...saved, updatedAt: "2026-02-01T00:00:00Z", title: "immediate" };
  expect(saveWorkspaceDraft({ resumeId: "a", resume, selectedId: "profile", editingId: "profile", scrollTop: 123 })).toBe(true);
  expect(readWorkspaceDraft("a", saved)?.resume.title).toBe("immediate");
  expect(readWorkspaceDraft("a", saved)?.scrollTop).toBe(123);
  expect(readWorkspaceDraft("b", saved)).toBeNull();
  expect(readWorkspaceDraft("a", { ...saved, updatedAt: "2026-03-01T00:00:00Z" })).toBeNull();
});
it("ignores corrupt recovery storage", () => {
  sessionStorage.setItem("swift-resume:workspace-draft", "broken");
  expect(readWorkspaceDraft("a", createBlankResume())).toBeNull();
});
