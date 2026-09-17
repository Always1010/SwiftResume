import { expect, it } from "vitest";
import { parseResumeText } from "./textImport";
import { plainText } from "./writingGuide";
it("recognizes headings while retaining unknown text and literal markup", () => {
  const resume = parseResumeText("姓名：陈同学\r\n电话：138 1234 5678\r\n邮箱：chen@example.com\n其他未识别信息\n项目经历\n<script>示例</script>\n完成迁移\n教育背景\n某大学 2020-2024");
  expect(resume.profile.name).toBe("陈同学");
  expect(resume.profile.phone).toBe("138 1234 5678");
  expect(resume.sections.map((s) => s.title)).toEqual(["待整理内容", "项目经历", "教育背景"]);
  const text = resume.sections.map((s) => s.type === "content" ? plainText(s.entries[0].body) : "").join("\n");
  expect(text).toContain("其他未识别信息");
  expect(text).toContain("<script>示例</script>");
  expect(text).toContain("某大学 2020-2024");
});
it("does not guess names and rejects empty or excessively large inputs", () => {
  expect(parseResumeText("某个自由标题\n自由内容").profile.name).toBe("");
  expect(() => parseResumeText("   ")).toThrow();
  expect(() => parseResumeText("a".repeat(100001))).toThrow();
});
