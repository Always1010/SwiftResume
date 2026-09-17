import { describe, expect, it } from "vitest";
import { createBlankResume, createSection, type ResumeAction } from "./resume";
import { createResumeHistory, resumeHistoryReducer, type ResumeHistory } from "./resumeHistory";
import { exportRecord } from "./resumeVersions";

const edit = (state: ResumeHistory, action: ResumeAction, time = 10000) => resumeHistoryReducer(state, { type: "edit", action, time });
const undo = (state: ResumeHistory) => resumeHistoryReducer(state, { type: "undo", time: 20000 });
const redo = (state: ResumeHistory) => resumeHistoryReducer(state, { type: "redo", time: 30000 });

describe("document undo history", () => {
  it("keeps downloaded snapshots across undo without adding an undo step for downloads", () => {
    let history = createResumeHistory(createBlankResume());
    history = edit(history, { type: "update-title", value: "投递版" });
    const record = exportRecord(history.present, "投递版.pdf");
    history = edit(history, { type: "record-export", value: record });
    expect(history.past).toHaveLength(1);
    const restored = undo(history);
    expect(restored.present.title).not.toBe("投递版");
    expect(restored.present.lastExport).toEqual(record);
    expect(redo(restored).present.lastExport).toEqual(record);
  });
  it("restores deleted modules, their rich text and theme changes in order", () => {
    const document = createBlankResume();
    const section = createSection("content");
    document.sections = [section];
    const start = createResumeHistory(document);
    const deleted = edit(start, { type: "set-sections", value: [] });
    const styled = edit(deleted, { type: "update-theme", value: { templateId: "minimal" } });
    const firstUndo = undo(styled);
    expect(firstUndo.present.theme).toEqual(document.theme);
    expect(firstUndo.present.sections).toEqual([]);
    const restored = undo(firstUndo);
    expect(restored.present.sections).toEqual([section]);
    expect(redo(redo(restored)).present.sections).toEqual([]);
    expect(redo(redo(restored)).present.theme.templateId).toBe("minimal");
    expect(Date.parse(restored.present.updatedAt)).toBeGreaterThan(Date.parse(styled.present.updatedAt));
  });
  it("groups continuous typing but separates pauses and destructive actions", () => {
    let history = createResumeHistory(createBlankResume());
    history = edit(history, { type: "update-title", value: "工" }, 1000);
    history = edit(history, { type: "update-title", value: "工作" }, 1100);
    expect(history.past).toHaveLength(1);
    history = edit(history, { type: "update-title", value: "工作简历" }, 3000);
    expect(history.past).toHaveLength(2);
    expect(undo(history).present.title).toBe("工作");
    history = edit(history, { type: "set-sections", value: [createSection("education")] }, 3050);
    history = edit(history, { type: "set-sections", value: [] }, 3100);
    expect(undo(history).present.sections).toHaveLength(1);
  });
  it("starts a new branch after undo without retaining stale redo states", () => {
    const start = createResumeHistory(createBlankResume());
    const changed = edit(start, { type: "update-title", value: "A" });
    const next = edit(undo(changed), { type: "update-title", value: "B" });
    expect(next.future).toHaveLength(0);
    expect(redo(next)).toBe(next);
    expect(undo(next).present.title).toBe(start.present.title);
  });
  it("does not retain another resume's history after switching or external replacement", () => {
    const changed = edit(createResumeHistory(createBlankResume()), { type: "update-title", value: "A" });
    const next = createBlankResume();
    next.title = "另一份";
    const switched = resumeHistoryReducer(changed, { type: "reset", document: next });
    expect(switched.past).toEqual([]);
    expect(switched.future).toEqual([]);
    expect(undo(switched).present).toBe(next);
  });
  it("ignores identical edits and bounds memory to 100 checkpoints", () => {
    let history = createResumeHistory(createBlankResume());
    expect(edit(history, { type: "update-title", value: history.present.title })).toBe(history);
    for (let index = 0; index < 120; index++) history = edit(history, { type: "update-title", value: `${index}` }, index * 1000);
    expect(history.past).toHaveLength(100);
  });
});
