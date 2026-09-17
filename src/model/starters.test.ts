import { expect, it } from "vitest";
import { clearResumeContent, createPurposeEntry, createQuickSection, createResumeFromTemplate } from "./resume";
import { plainText, writingGuide } from "./writingGuide";
import { checkResume } from "./resumeChecks";

it("creates complete, distinct career examples with matching layouts", () => {
  const documents = (["graduate", "experienced", "career-change"] as const).map((scene) => createResumeFromTemplate(scene));
  expect(new Set(documents.map((r) => r.theme.templateId)).size).toBe(3);
  expect(new Set(documents.map((r) => r.profile.headline)).size).toBe(3);
  for (const resume of documents) {
    expect(resume.profile.name).toContain("【示例】");
    expect(checkResume(resume).some((c) => c.id === "profile:sample")).toBe(true);
    for (const section of resume.sections) {
      if (section.type === "content") expect(plainText(section.entries[0].body).length).toBeGreaterThan(40);
      else expect(section.items[0].school).not.toBe("");
    }
  }
  expect(documents[0].sections[0].type).toBe("education");
  expect(documents[1].sections[0].title).toBe("工作经历");
  expect(documents[2].sections[0].title).toBe("个人简介");
});

it("clears examples without changing the chosen structure or layout", () => {
  const source = createResumeFromTemplate("experienced");
  const blank = clearResumeContent(source);
  expect(blank.theme).toEqual(source.theme);
  expect(blank.sections.map((s) => [s.id, s.title])).toEqual(source.sections.map((s) => [s.id, s.title]));
  expect(blank.profile.name).toBe("");
  expect(source.profile.name).not.toBe("");
  for (const section of blank.sections) {
    if (section.type === "content") expect(plainText(section.entries[0].body)).toBe("");
  }
  expect(createResumeFromTemplate("graduate", false).profile.name).toBe("");
  expect(createResumeFromTemplate("blank").sections).toHaveLength(0);
});

it("gives each module its own fill-in structure and preserves guidance after renaming", () => {
  const section = createQuickSection("project");
  if (section.type !== "content") throw new Error("expected content");
  section.title = "我做过的事情";
  expect(writingGuide(section).title).toBe("项目名称");
  expect(plainText(section.entries[0].body)).toContain("项目背景");
  expect(createQuickSection("education").type).toBe("education");
  const skills = createPurposeEntry("skills");
  expect(skills.date).toBe("");
  expect(skills.body.content?.[0].type).toBe("bulletList");
  expect(createPurposeEntry("summary").body.content).toHaveLength(1);
  expect(plainText(createPurposeEntry("work", "example").body)).toContain("负责");
});
