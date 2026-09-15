import { isResumeDocument, type ResumeDocument } from "../model/resume";

const DATABASE = "swift-resume";
const STORE = "documents";
const DOCUMENT_KEY = "active-resume";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadResume(): Promise<ResumeDocument | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(DOCUMENT_KEY);
    request.onsuccess = () => resolve(isResumeDocument(request.result) ? request.result : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveResume(resume: ResumeDocument): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(resume, DOCUMENT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export function downloadResume(resume: ResumeDocument) {
  const safeTitle = resume.title.replace(/[\\/:*?"<>|]/g, "-") || "SwiftResume";
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.swiftresume.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function parseResumeFile(file: File): Promise<ResumeDocument> {
  const value: unknown = JSON.parse(await file.text());
  if (!isResumeDocument(value)) {
    throw new Error("文件不是有效的 SwiftResume 简历备份");
  }
  return value;
}
