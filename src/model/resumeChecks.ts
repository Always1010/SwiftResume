import type { ResumeDocument } from "./resume";
import { plainText } from "./writingGuide";
export interface ResumeCheck { id: string; sectionId: string; message: string }
export function checkResume(resume: ResumeDocument): ResumeCheck[] {
  const checks: ResumeCheck[] = [];
  const add = (sectionId: string, key: string, message: string) => checks.push({ id: `${sectionId}:${key}`, sectionId, message });
  if (!resume.profile.name.trim()) add("profile", "name", "尚未填写姓名");
  if (!resume.profile.phone.trim() && !resume.profile.email.trim()) add("profile", "contact", "尚未填写手机或邮箱，招聘方可能无法联系你");
  if (resume.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.profile.email)) add("profile", "email", "邮箱格式可能不完整，请检查");
  const examples = /【[^】]+】|BACKEND-007|backend007@example|银河系|星际|X省|待填写/;
  if (examples.test(Object.values(resume.profile).filter((v) => typeof v === "string").join(" "))) add("profile", "sample", "个人信息可能含有示例文字或占位内容");
  const dateFormats = new Set<string>();
  for (const section of resume.sections.filter((s) => s.enabled)) {
    const rows = section.type === "content" ? section.entries.map((e) => ({ text: `${e.title}\n${e.subtitle}\n${plainText(e.body)}`, date: e.date })) : section.items.map((e) => ({ text: `${e.school}\n${e.major}\n${e.degree}\n${e.detail}`, date: e.date }));
    if (!rows.some((row) => row.text.trim())) add(section.id, "empty", `“${section.title}”还没有内容，可填写或隐藏`);
    if (rows.some((row) => examples.test(row.text))) add(section.id, "sample", `“${section.title}”可能含有示例或【占位内容】`);
    if (rows.some((row) => row.text.split("\n").some((p) => p.length > 250))) add(section.id, "long", `“${section.title}”存在超过 250 字的段落，建议拆成要点`);
    for (const row of rows) {
      if (!row.date.trim()) continue;
      const match = /\d{4}([./年-])\d{1,2}/.exec(row.date);
      if (match) dateFormats.add(match[1]);
      else add(section.id, `date:${row.date}`, `“${section.title}”的时间格式不明确，建议使用 2024.07 – 2025.06`);
    }
  }
  if (dateFormats.size > 1) add("profile", "dates", "不同经历使用了不同日期格式，建议统一年月的写法");
  return checks;
}
export function checkPdfPage(textLength: number, usedHeight: number, isLast: boolean, total: number): string | null {
  if (!textLength) return "本页未检测到文字，请检查是否为空白页或仅包含图片。";
  if (isLast && total > 1 && usedHeight < 0.25) return "末页内容较少，可返回编辑调整段落间距或排版密度。";
  return null;
}
