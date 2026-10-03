import { normalizeResumeDocument, type ResumeDocument } from "../model/resume";

type PrintJob = { resume: ResumeDocument; expiresAt: number };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("swift-resume-print-jobs", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("jobs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPrintJob(id: string): Promise<ResumeDocument | null> {
  const db = await database();
  try {
    const job = await new Promise<PrintJob | undefined>((resolve, reject) => {
      const request = db.transaction("jobs", "readonly").objectStore("jobs").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return job && job.expiresAt > Date.now() ? normalizeResumeDocument(job.resume) : null;
  } finally { db.close(); }
}
