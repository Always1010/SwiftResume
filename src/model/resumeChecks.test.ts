import { expect, it } from "vitest";
import { createDefaultResume, createResumeFromTemplate } from "./resume";
import { checkPdfPage, checkResume } from "./resumeChecks";
it("locates missing contact and placeholder content while excluding hidden modules", () => {
  const resume = createResumeFromTemplate("experienced", false);
  expect(checkResume(resume).some((c) => c.id === "profile:contact")).toBe(true);
  resume.sections[0].enabled = false;
  expect(checkResume(resume).some((c) => c.sectionId === resume.sections[0].id)).toBe(false);
  expect(checkResume(createDefaultResume()).some((c) => c.id === "profile:sample")).toBe(true);
});
it("distinguishes empty pages and sparse last pages from regular pages", () => {
  expect(checkPdfPage(0, 0, false, 2)).toContain("未检测到文字");
  expect(checkPdfPage(30, 0.2, true, 2)).toContain("末页内容较少");
  expect(checkPdfPage(30, 0.2, true, 1)).toBeNull();
  expect(checkPdfPage(500, 0.8, true, 2)).toBeNull();
});

it("keeps sample warnings after renaming and covers profile details, dates and section titles", () => {
  const resume = createDefaultResume();
  resume.profile.name = "Lin Xiao";
  expect(checkResume(resume).filter((check) => check.id.endsWith(":sample")).some((check) => check.sectionId !== "profile")).toBe(true);
  const blank = createResumeFromTemplate("experienced", false);
  blank.profile.name = "Lin Xiao";
  blank.profile.details = [{ id: "sample", label: "学校", value: "【示例】大学" }];
  expect(checkResume(blank).some((check) => check.id === "profile:sample")).toBe(true);
  blank.profile.details = [];
  blank.sections[0].title = "【示例】经历";
  expect(checkResume(blank).some((check) => check.id === `${blank.sections[0].id}:sample`)).toBe(true);
  blank.sections[0].enabled = false;
  expect(checkResume(blank).filter((check) => check.id.endsWith(":sample"))).toHaveLength(0);
});
