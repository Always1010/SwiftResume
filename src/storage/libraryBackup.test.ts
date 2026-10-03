import { expect, it } from "vitest";
import { createDefaultResume } from "../model/resume";
import { mergeImportedDocuments, parseBackupValue, readCurrentDocument } from "./libraryBackup";
import { createResumeSummary, type ResumeLibrary } from "./resumeStorage";
it("keeps existing job copies accessible as ordinary resumes with all content intact", () => {
  const resume = { ...createDefaultResume(), title: "已有岗位副本", target: { company: "公司", role: "岗位", notes: "备注" } };
  const batch = parseBackupValue(JSON.parse(JSON.stringify({ format: "swift-resume-library", version: 1, documents: [{ id: "old", resume }] })));
  expect(batch.documents[0].resume).toEqual(resume);
  expect(batch.skipped).toEqual([]);
});
it("reports malformed records and refuses unsupported versions", () => {
  const resume = createDefaultResume();
  const bad = { ...resume, profile: { ...resume.profile, details: "bad" } };
  expect(parseBackupValue({ format: "swift-resume-library", version: 1, documents: [{ resume }, { resume: bad }] }).skipped).toHaveLength(1);
  expect(() => parseBackupValue({ ...resume, schemaVersion: 3 })).toThrow();
  expect(readCurrentDocument({ ...resume, sections: [{ ...resume.sections[1], entries: [{ id: "x", title: "", subtitle: "", date: "", body: { type: "doc", content: "bad" } }] }] })).toBeNull();

});
it("restores selected documents atomically as independent new IDs without replacing existing items", () => {
  const resume = createDefaultResume();
  const library: ResumeLibrary = { version: 1, activeResumeId: "existing", resumes: [createResumeSummary("existing", resume)] };
  const merged = mergeImportedDocuments(library, [{ id: "existing", resume }]);
  expect(merged.library.resumes).toHaveLength(2);
  expect(merged.documents[0].id).not.toBe("existing");
  expect(merged.library.resumes[0]).toEqual(library.resumes[0]);
  merged.documents[0].resume.profile.name = "changed";
  expect(resume.profile.name).not.toBe("changed");
});
