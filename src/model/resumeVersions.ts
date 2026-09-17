import type { ResumeDocument } from "./resume";
import { plainText } from "./writingGuide";
export function jobVersion(source: ResumeDocument, company: string, role: string): ResumeDocument {
  const copy = structuredClone(source);
  delete copy.lastExport;
  copy.target = { company: company.trim(), role: role.trim(), notes: "" };
  copy.title = [copy.target.company, copy.target.role].filter(Boolean).join(" · ") || `${source.title} 岗位版`;
  copy.updatedAt = new Date().toISOString();
  return copy;
}
export function exportRecord(resume: ResumeDocument, filename: string): NonNullable<ResumeDocument["lastExport"]> {
  const { lastExport: _previous, ...snapshot } = structuredClone(resume);
  return { at: new Date().toISOString(), filename, snapshot };
}
export interface VersionDifference { label: string; before: string; after: string }
function comparable(resume: ResumeDocument): Map<string, string> {
  const result = new Map<string, string>();
  result.set("简历名称", resume.title);
  result.set("目标岗位", [resume.target?.company, resume.target?.role, resume.target?.notes].filter(Boolean).join(" · "));
  const { photo, photoSource: _source, photoCrop, photoBackground, ...profile } = resume.profile;
  result.set("个人信息", Object.entries(profile).map(([key, value]) => `${({ name: "姓名", headline: "求职方向", ageGender: "年龄 / 性别", location: "所在地", phone: "手机", email: "邮箱", details: "扩展信息" } as Record<string, string>)[key]}：${Array.isArray(value) ? value.map((d) => `${d.label}：${d.value}`).join("；") : value}`).join("\n"));
  result.set("照片", photo);
  result.set("照片裁切与底色", JSON.stringify({ photoCrop, photoBackground }));
  result.set("排版样式", JSON.stringify(resume.theme));
  result.set("模块顺序", resume.sections.map((s) => `${s.title}${s.enabled ? "" : "（隐藏）"}`).join(" → "));
  const seen = new Map<string, number>();
  for (const section of resume.sections) {
    const n = (seen.get(section.title) ?? 0) + 1;
    seen.set(section.title, n);
    const key = `${section.title || "未命名模块"}${n > 1 ? ` (${n})` : ""}`;
    result.set(`内容：${key}`, section.type === "education" ? section.items.map((e) => [e.school, e.major, e.degree, e.date, e.detail].join("\n")).join("\n\n") : section.entries.map((e) => [e.title, e.subtitle, e.date, plainText(e.body)].filter(Boolean).join("\n")).join("\n\n"));
    if (section.type === "content") result.set(`正文格式：${key}`, JSON.stringify(section.entries.map((e) => e.body)));
  }
  return result;
}
export function compareVersions(before: ResumeDocument, after: ResumeDocument): VersionDifference[] {
  const left = comparable(before), right = comparable(after);
  return [...new Set([...left.keys(), ...right.keys()])].filter((key) => left.get(key) !== right.get(key)).filter((key) => !key.startsWith("正文格式：") || left.get(key.replace("正文格式：", "内容：")) === right.get(key.replace("正文格式：", "内容："))).map((label) => ({ label, before: label === "照片" || label.startsWith("正文格式：") ? (left.get(label) ? "原版本已设置" : "未设置") : left.get(label) ?? "（无）", after: label === "照片" || label.startsWith("正文格式：") ? "内容已变更" : right.get(label) ?? "（无）" }));
}
