import { createBlankResume, createContentEntry, createQuickSection, type ContentSection, type ResumeDocument, type SectionPurpose } from "./resume";
const headings: Record<string, { title: string; purpose: SectionPurpose }> = {
  "教育背景": { title: "教育背景", purpose: "custom" }, "教育经历": { title: "教育经历", purpose: "custom" }, education: { title: "教育背景", purpose: "custom" },
  "工作经历": { title: "工作经历", purpose: "work" }, "实习经历": { title: "实习经历", purpose: "work" }, experience: { title: "工作经历", purpose: "work" }, "work experience": { title: "工作经历", purpose: "work" },
  "项目经历": { title: "项目经历", purpose: "project" }, "项目经验": { title: "项目经验", purpose: "project" }, projects: { title: "项目经历", purpose: "project" },
  "专业技能": { title: "专业技能", purpose: "skills" }, "技能": { title: "技能", purpose: "skills" }, skills: { title: "专业技能", purpose: "skills" },
  "自我评价": { title: "自我评价", purpose: "summary" }, "个人简介": { title: "个人简介", purpose: "summary" }, summary: { title: "个人简介", purpose: "summary" },
  "获奖经历": { title: "获奖经历", purpose: "custom" }, "个人荣誉": { title: "个人荣誉", purpose: "custom" }, "证书": { title: "证书", purpose: "custom" },
};
export function parseResumeText(text: string): ResumeDocument {
  if (!text.trim()) throw new Error("请先粘贴简历文本");
  if (text.length > 100_000) throw new Error("文本过长，请控制在 10 万字以内");
  const resume = createBlankResume();
  resume.title = "文本导入简历";
  resume.profile.name = /(?:^|\n)\s*姓名\s*[:：]\s*([^\n]+)/.exec(text)?.[1].trim() ?? "";
  resume.profile.email = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.exec(text)?.[0] ?? "";
  resume.profile.phone = /(?:手机|电话|Phone|Tel)\s*[:：]\s*([+\d][\d ()-]{5,})/i.exec(text)?.[1].trim() ?? "";
  const groups: { title: string; purpose: SectionPurpose; lines: string[] }[] = [];
  let current = { title: "待整理内容", purpose: "custom" as SectionPurpose, lines: [] as string[] };
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const key = line.trim().replace(/^#{1,6}\s*/, "").replace(/[:：]\s*$/, "").toLowerCase();
    const heading = headings[key];
    if (heading) {
      if (current.lines.some((l) => l.trim())) groups.push(current);
      current = { ...heading, lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.some((l) => l.trim())) groups.push(current);
  resume.sections = groups.map((group) => {
    const section = createQuickSection(group.purpose) as ContentSection;
    section.title = group.title;
    const entry = createContentEntry();
    entry.body = { type: "doc", content: group.lines.map((line) => ({ type: "paragraph", ...(line ? { content: [{ type: "text", text: line }] } : {}) })) };
    section.entries = [entry];
    return section;
  });
  if (!resume.sections.length) throw new Error("只识别到模块标题，请补充正文后再导入");
  return resume;
}
