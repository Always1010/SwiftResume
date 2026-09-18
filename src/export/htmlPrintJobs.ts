import { normalizeResumeDocument, type ResumeDocument } from "../model/resume";

const LIFETIME = 30 * 60 * 1000;
type PrintJob = { resume: ResumeDocument; expiresAt: number };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("swift-resume-print-jobs", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("jobs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePrintJob(id: string, resume: ResumeDocument): Promise<string> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("jobs", "readwrite");
      const store = tx.objectStore("jobs");
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if ((entry.value as PrintJob).expiresAt < Date.now()) entry.delete();
        entry.continue();
      };
      store.put({ resume, expiresAt: Date.now() + LIFETIME } satisfies PrintJob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("打印快照保存中断"));
    });
  } finally { db.close(); }
  const url = new URL(window.location.href);
  url.search = ""; url.hash = "";
  url.searchParams.set("view", "html-print");
  url.searchParams.set("job", id);
  return url.toString();
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
