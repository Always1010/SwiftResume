import { expect, it } from "vitest";
import { createQuickSection, createResumeFromTemplate } from "./resume";
import { plainText, writingGuide } from "./writingGuide";

it("prepares different starter structures without inserting fictional information", () => {
  for (const scene of ["graduate", "experienced", "career-change"] as const) {
    const resume = createResumeFromTemplate(scene);
    expect(resume.profile.name).toBe("");
    expect(resume.profile.photo).toBe("");
    expect(resume.sections.length).toBeGreaterThan(3);
    for (const section of resume.sections) {
      if (section.type === "content") expect(plainText(section.entries[0].body)).toBe("");
    }
  }
  expect(createResumeFromTemplate("graduate").sections[0].type).toBe("education");
  expect(createResumeFromTemplate("experienced").sections[0].title).toBe("工作经历");
});

it("keeps semantic writing guidance after a module is renamed", () => {
  const section = createQuickSection("project");
  if (section.type !== "content") throw new Error("expected content");
  section.title = "我做过的事情";
  expect(writingGuide(section).title).toBe("项目名称");
  expect(createQuickSection("education").type).toBe("education");
});
