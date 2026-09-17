import { expect, it } from "vitest";
import { clearResumeContent, createPurposeEntry, createQuickSection, createResumeFromTemplate, normalizeResumeDocument, type ResumeDocument } from "./resume";
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

it.each(["graduate", "experienced", "career-change"] as const)("keeps the %s structure when examples are disabled", (scene) => {
  const example = createResumeFromTemplate(scene);
  const blank = createResumeFromTemplate(scene, false);
  expect(blank.theme).toEqual(example.theme);
  expect(blank.sections.map((section) => [section.type, section.title])).toEqual(example.sections.map((section) => [section.type, section.title]));
  expect(blank.profile.name).toBe("");
  expect(blank.profile.details).toEqual([]);
  for (const section of blank.sections) {
    if (section.type === "content") {
      expect(section.entries).toHaveLength(1);
      expect(section.entries[0]).toMatchObject({ title: "", subtitle: "", date: "" });
      expect(plainText(section.entries[0].body)).toBe("");
    } else {
      expect(section.items).toHaveLength(1);
      expect(section.items[0]).toMatchObject({ school: "", major: "", degree: "", date: "", detail: "" });
    }
  }
});

function identities(resume: ResumeDocument) {
  return [
    ...resume.profile.details.map((detail) => detail.id),
    ...resume.sections.flatMap((section) => [section.id, ...(section.type === "education" ? section.items : section.entries).map((item) => item.id)]),
  ];
}

it.each(["graduate", "experienced", "career-change"] as const)("creates independently editable %s examples without changing stored documents", (scene) => {
  const first = createResumeFromTemplate(scene);
  const saved = JSON.parse(JSON.stringify(first));
  const second = createResumeFromTemplate(scene);
  expect(new Set(identities(first)).size).toBe(identities(first).length);
  expect(identities(first).some((id) => identities(second).includes(id))).toBe(false);
  first.profile.details[0].value = "用户修改";
  for (const section of first.sections) {
    if (section.type === "education") section.items[0].school = "用户学校";
    else section.entries[0].body.content?.push({ type: "paragraph", content: [{ type: "text", text: "用户经历" }] });
  }
  expect(JSON.stringify(second)).not.toContain("用户修改");
  expect(JSON.stringify(second)).not.toContain("用户学校");
  expect(JSON.stringify(second)).not.toContain("用户经历");
  expect(JSON.stringify(createResumeFromTemplate(scene))).not.toContain("用户经历");
  expect(normalizeResumeDocument(saved)).toEqual(saved);
});

it("provides complete scenario-specific projects and explicitly fictional data", () => {
  for (const scene of ["graduate", "experienced", "career-change"] as const) {
    const resume = createResumeFromTemplate(scene);
    expect(resume.profile.details.find((detail) => detail.label === "示例说明")?.value).toContain("均为虚构");
    const projects = resume.sections.find((section) => section.type === "content" && section.purpose === "project");
    if (projects?.type !== "content") throw new Error("expected project section");
    expect(projects.entries.length).toBeGreaterThanOrEqual(3);
    for (const project of projects.entries) {
      expect(project.title).toContain("【示例】");
      expect(project.date).not.toBe("");
      const content = plainText(project.body);
      expect(content).toContain("项目背景");
      expect(content).toContain(scene === "career-change" ? "方法与工具" : "技术栈");
      const actions = project.body.content?.find((node) => node.type === "bulletList");
      expect(actions?.content?.length).toBeGreaterThanOrEqual(3);
    }
    const work = resume.sections.find((section) => section.type === "content" && section.purpose === "work");
    if (work?.type !== "content") throw new Error("expected work section");
    expect(work.entries).toHaveLength(scene === "graduate" ? 1 : 2);
  }
  const graduate = createResumeFromTemplate("graduate");
  expect(graduate.sections.some((section) => section.title === "荣誉与校园实践")).toBe(true);
  const careerChange = createResumeFromTemplate("career-change");
  expect(JSON.stringify(careerChange)).toContain("未上线的个人练习");
  expect(JSON.stringify(careerChange)).not.toContain("前端开发");
});
