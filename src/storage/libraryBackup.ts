import { normalizeResumeDocument, type ResumeDocument, type RichTextNode } from "../model/resume";
import { createResumeSummary, loadResumeById, type ResumeLibrary } from "./resumeStorage";
export interface ImportDocument { id: string; resume: ResumeDocument; createdAt?: string }
export interface ImportBatch { documents: ImportDocument[]; skipped: string[] }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => typeof value[key] === "string");
function validNode(node: unknown, depth = 0): node is RichTextNode {
  if (!object(node) || depth > 30 || typeof node.type !== "string") return false;
  return (node.text === undefined || typeof node.text === "string") && (node.attrs === undefined || object(node.attrs)) && (node.marks === undefined || Array.isArray(node.marks) && node.marks.every((m) => object(m) && typeof m.type === "string" && (m.attrs === undefined || object(m.attrs)))) && (node.content === undefined || Array.isArray(node.content) && node.content.every((n) => validNode(n, depth + 1)));
}
export function readCurrentDocument(value: unknown, snapshot = false): ResumeDocument | null {
  if (!object(value) || value.schemaVersion !== 3 || !strings(value, ["title", "updatedAt"]) || !object(value.profile) || !object(value.theme) || !Array.isArray(value.sections)) return null;
  const profile = value.profile;
  if (!strings(profile, ["name", "headline", "ageGender", "location", "phone", "email", "photo"]) || !Array.isArray(profile.details) || !profile.details.every((d) => object(d) && strings(d, ["id", "label", "value"]))) return null;
  if (typeof value.theme.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(value.theme.accent) || typeof value.theme.density !== "number" || !Number.isFinite(value.theme.density)) return null;
  const ids = new Set<string>();
  for (const section of value.sections) {
    if (!object(section) || !strings(section, ["id", "title"]) || typeof section.enabled !== "boolean" || ids.has(section.id as string) || section.id === "profile") return null;
    ids.add(section.id as string);
    const rows = section.type === "education" ? section.items : section.type === "content" ? section.entries : null;
    if (!Array.isArray(rows)) return null;
    if (section.purpose !== undefined && !["work", "project", "skills", "summary", "custom"].includes(section.purpose as string)) return null;
    const rowIds = new Set<string>();
    for (const row of rows) {
      if (!object(row) || typeof row.id !== "string" || rowIds.has(row.id)) return null;
      rowIds.add(row.id);
      if (section.type === "education" ? !strings(row, ["school", "date", "major", "degree", "detail"]) : !strings(row, ["title", "subtitle", "date"]) || !validNode(row.body) || row.body.type !== "doc") return null;
    }
  }
  if (value.target !== undefined && (!object(value.target) || !strings(value.target, ["company", "role", "notes"]))) return null;
  if (value.lastExport !== undefined && (snapshot || !object(value.lastExport) || !strings(value.lastExport, ["at", "filename"]) || !readCurrentDocument(value.lastExport.snapshot, true))) return null;
  return normalizeResumeDocument(value);
}
export function parseBackupValue(value: unknown): ImportBatch {
  if (!object(value)) throw new Error("文件不是有效的简历备份");
  const source = value.format === "swift-resume-library" && value.version === 1 && Array.isArray(value.documents) ? value.documents : [{ id: "single", resume: value }];
  if (source.length > 500) throw new Error("单次最多恢复 500 份简历，请分批处理");
  const result: ImportBatch = { documents: [], skipped: [] };
  source.forEach((item, index) => {
    const resume = object(item) ? readCurrentDocument(item.resume) : null;
    if (resume) result.documents.push({ id: `import-${index}`, resume, createdAt: object(item) && typeof item.createdAt === "string" ? item.createdAt : undefined });
    else result.skipped.push(`第 ${index + 1} 项格式不正确或不受当前版本支持`);
  });
  if (!result.documents.length) throw new Error("没有可导入的当前版本简历。请使用本版本 JSON 备份，或粘贴旧简历文本。");
  return result;
}
export function mergeImportedDocuments(library: ResumeLibrary, documents: ImportDocument[]) {
  if (!documents.length) throw new Error("请至少选择一份简历");
  const added = documents.map((item) => ({ ...item, id: crypto.randomUUID(), resume: structuredClone(item.resume) }));
  const next: ResumeLibrary = { ...library, activeResumeId: added[0].id, resumes: [...library.resumes, ...added.map((item) => createResumeSummary(item.id, item.resume, item.createdAt ?? item.resume.updatedAt))] };
  return { library: next, documents: added };
}
export async function createLibraryBackup(library: ResumeLibrary) {
  const documents = await Promise.all(library.resumes.map(async (summary) => {
    const resume = await loadResumeById(summary.id);
    if (!resume) throw new Error(`无法读取“${summary.title}”，整库备份未生成，请先检查该简历。`);
    return { id: summary.id, createdAt: summary.createdAt, resume };
  }));
  return { format: "swift-resume-library", version: 1, exportedAt: new Date().toISOString(), activeResumeId: library.activeResumeId, documents };
}
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
