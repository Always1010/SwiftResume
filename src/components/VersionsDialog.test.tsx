// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { createBlankResume, type ResumeDocument } from "../model/resume";
import { exportRecord } from "../model/resumeVersions";
import { VersionsDialog } from "./VersionsDialog";

function render(resume: ResumeDocument) {
  return renderToStaticMarkup(<VersionsDialog resume={resume} library={{ version: 1, activeResumeId: "one", resumes: [] }}
    onClose={() => {}} onUpdate={() => {}} onCreate={async () => {}} onSyncContacts={async () => {}} />);
}
it("uses truthful request labels for print and legacy download records", () => {
  const resume = createBlankResume();
  expect(render(resume)).toContain("尚无导出记录");
  resume.lastExport = exportRecord(resume, { kind: "print" });
  const printed = render(resume);
  expect(printed).toContain("最近发起导出");
  expect(printed).toContain("打印 / 保存 PDF");
  expect(printed).toContain("取消打印也会保留这条请求记录");
  expect(printed).not.toContain("尚无下载记录");
  resume.lastExport = { at: resume.lastExport.at, snapshot: resume.lastExport.snapshot, filename: "old.pdf" };
  expect(render(resume)).toContain("下载 old.pdf");
  expect(render(resume)).toContain("最近发起导出时的内容");
});
