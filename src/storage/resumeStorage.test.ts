import { describe, expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import { createResumeSummary, updateResumeSummary, type ResumeLibrary } from "./resumeStorage";

describe("resume library", () => {
  it("tracks document metadata without losing its creation time", () => {
    const resume = createDefaultResume();
    const summary = createResumeSummary("resume-1", resume, "2026-01-01T00:00:00.000Z");
    const library: ResumeLibrary = { version: 1, activeResumeId: "resume-1", resumes: [summary] };
    const changed = { ...resume, title: "求职版本", updatedAt: "2026-02-01T00:00:00.000Z" };
    const next = updateResumeSummary(library, "resume-1", changed);
    expect(next.resumes[0]).toEqual({
      id: "resume-1",
      title: "求职版本",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });
});
