// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createBlankResume, createQuickSection } from "../model/resume";
import { EditorPanel } from "./EditorPanel";
vi.mock("./customEditors/ContentBodyEditor", () => ({ ContentBodyEditor: () => <div>正文编辑器</div> }));

function renderPurpose(purpose: "work" | "project" | "skills" | "summary") {
  const resume = createBlankResume();
  const section = createQuickSection(purpose);
  resume.sections = [section];
  return renderToStaticMarkup(<EditorPanel resume={resume} selectedId={section.id} onProfileChange={() => {}} onSectionChange={() => {}} onDeleteSection={() => {}} />);
}
it("shows dates for experiences but removes irrelevant fields from skills and summaries", () => {
  expect(renderPurpose("work")).toContain("公司 / 组织");
  expect(renderPurpose("project")).toContain("承担角色");
  expect(renderPurpose("project")).toContain("时间（选填）");
  expect(renderPurpose("skills")).toContain("技能类别");
  expect(renderPurpose("skills")).not.toContain("时间（选填）");
  const summary = renderPurpose("summary");
  expect(summary).toContain("用两三句话介绍自己");
  expect(summary).not.toContain("content-heading-fields");
  expect(summary).not.toContain("添加简介");
});
