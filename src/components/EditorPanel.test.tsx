// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createBlankResume, createDefaultResume, createQuickSection } from "../model/resume";
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
  expect(summary).toContain("个人简介");
  expect(summary).not.toContain("content-heading-fields");
  expect(summary).not.toContain("添加简介");
});

it("offers drag handles and a full-width choice for every profile detail", () => {
  const resume = createDefaultResume();
  const html = renderToStaticMarkup(<EditorPanel resume={resume} selectedId="profile" onProfileChange={() => {}} onSectionChange={() => {}} onDeleteSection={() => {}} />);
  expect(html.match(/class="detail-drag-handle"/g)).toHaveLength(resume.profile.details.length);
  expect(html.match(/独占一行/g)).toHaveLength(resume.profile.details.length);
  expect(html).toContain("draggable=\"true\"");
  expect(html).toContain("checked=\"\"");
});

it("keeps authoring fields without writing advice or fill-in examples", () => {
  for (const purpose of ["work", "project", "skills", "summary"] as const) {
    const html = renderPurpose(purpose);
    expect(html).not.toMatch(/写作建议|查看写作示例|填入空白正文|writing-guidance|writing-example/);
    expect(html).toContain("正文编辑器");
  }
});
