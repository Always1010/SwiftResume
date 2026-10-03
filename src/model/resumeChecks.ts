import type { ResumeDocument } from "./resume";
import { plainText } from "./contentLabels";
export interface ResumeCheck { id: string; sectionId: string; message: string }
export function checkResume(resume: ResumeDocument): ResumeCheck[] {
  const checks: ResumeCheck[] = [];
  const add = (sectionId: string, key: string, message: string) => checks.push({ id: `${sectionId}:${key}`, sectionId, message });
  if (!resume.profile.name.trim()) add("profile", "name", "尚未填写姓名");
  if (!resume.profile.phone.trim() && !resume.profile.email.trim()) add("profile", "contact", "尚未填写手机或邮箱，招聘方可能无法联系你");
  if (resume.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.profile.email)) add("profile", "email", "邮箱格式可能不完整，请检查");
  for (const section of resume.sections.filter((s) => s.enabled)) {
    const rows = section.type === "content" ? section.entries.map((e) => ({ text: `${e.title}\n${e.subtitle}\n${plainText(e.body)}`, date: e.date })) : section.items.map((e) => ({ text: `${e.school}\n${e.major}\n${e.degree}\n${e.detail}`, date: e.date }));
    if (!rows.some((row) => row.text.trim())) add(section.id, "empty", `“${section.title}”还没有内容，可填写或隐藏`);

  }
  return checks;
}
export function checkPdfPage(textLength: number, usedHeight: number, isLast: boolean, total: number): string | null {
  if (!textLength) return "本页未检测到文字，请检查是否为空白页或仅包含图片。";
  if (isLast && total > 1 && usedHeight < 0.25) return "末页内容较少，可返回编辑调整段落间距或排版密度。";
  return null;
}
