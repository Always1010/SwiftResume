import { normalizeResumeDocument, type ResumeDocument } from "../model/resume";

const KEY = "swift-resume:workspace-draft";
export interface WorkspaceDraft {
  resumeId: string;
  resume: ResumeDocument;
  selectedId: string;
  editingId: string | null;
  scrollTop: number;
}

// Synchronous, tab-local recovery bridges the IndexedDB debounce on refresh.
// It never replaces a newer saved document or another resume's data.
export function readWorkspaceDraft(resumeId: string, saved: ResumeDocument): WorkspaceDraft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as WorkspaceDraft | null;
    if (!draft || draft.resumeId !== resumeId) return null;
    const resume = normalizeResumeDocument(draft.resume);
    if (!resume || !Number.isFinite(Date.parse(resume.updatedAt)) || Date.parse(resume.updatedAt) < Date.parse(saved.updatedAt)) return null;
    const exists = (id: unknown) => id === "profile" || resume.sections.some((section) => section.id === id && section.enabled);
    return { resumeId, resume, selectedId: exists(draft.selectedId) ? draft.selectedId : "profile", editingId: exists(draft.editingId) ? draft.editingId : null, scrollTop: Number.isFinite(draft.scrollTop) ? Math.max(0, draft.scrollTop) : 0 };
  } catch { return null; }
}
export function saveWorkspaceDraft(draft: WorkspaceDraft): boolean {
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)); return true; } catch { return false; }
}
