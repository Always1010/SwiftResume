import { createDefaultResume, isResumeDocument, type ResumeDocument } from "../model/resume";

const DATABASE = "swift-resume";
const STORE = "documents";
const LEGACY_DOCUMENT_KEY = "active-resume";
const LIBRARY_KEY = "resume-library";
const resumeKey = (resumeId: string) => `resume:${resumeId}`;

export interface ResumeSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeLibrary {
  version: 1;
  activeResumeId: string;
  resumes: ResumeSummary[];
}

export interface ResumeWorkspace {
  library: ResumeLibrary;
  resume: ResumeDocument;
}

const makeId = () => crypto.randomUUID();

export function createResumeSummary(id: string, resume: ResumeDocument, createdAt = resume.updatedAt): ResumeSummary {
  return { id, title: resume.title, createdAt, updatedAt: resume.updatedAt };
}

export function updateResumeSummary(library: ResumeLibrary, resumeId: string, resume: ResumeDocument): ResumeLibrary {
  const current = library.resumes.find((item) => item.id === resumeId);
  if (current?.title === resume.title && current.updatedAt === resume.updatedAt) return library;
  return {
    ...library,
    resumes: library.resumes.map((item) =>
      item.id === resumeId ? { ...item, title: resume.title, updatedAt: resume.updatedAt } : item,
    ),
  };
}

function isResumeLibrary(value: unknown): value is ResumeLibrary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResumeLibrary>;
  return candidate.version === 1 && typeof candidate.activeResumeId === "string" && Array.isArray(candidate.resumes);
}

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

function getValue<T>(database: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function loadResumeWorkspace(): Promise<ResumeWorkspace> {
  const database = await openDatabase();
  try {
    const storedLibrary = await getValue<unknown>(database, LIBRARY_KEY);
    if (isResumeLibrary(storedLibrary)) {
      const preferred = storedLibrary.resumes.find((item) => item.id === storedLibrary.activeResumeId)
        ?? storedLibrary.resumes[0];
      if (preferred) {
        const storedResume = await getValue<unknown>(database, resumeKey(preferred.id));
        if (isResumeDocument(storedResume)) {
          const library = preferred.id === storedLibrary.activeResumeId
            ? storedLibrary
            : { ...storedLibrary, activeResumeId: preferred.id };
          return { library, resume: storedResume };
        }
      }
    }

    const legacy = await getValue<unknown>(database, LEGACY_DOCUMENT_KEY);
    const resume = isResumeDocument(legacy) ? legacy : createDefaultResume();
    const id = makeId();
    const library: ResumeLibrary = {
      version: 1,
      activeResumeId: id,
      resumes: [createResumeSummary(id, resume)],
    };
    await saveResumeWorkspace(id, resume, library, database);
    return { library, resume };
  } finally {
    database.close();
  }
}

export async function loadResumeById(resumeId: string): Promise<ResumeDocument | null> {
  const database = await openDatabase();
  try {
    const value = await getValue<unknown>(database, resumeKey(resumeId));
    return isResumeDocument(value) ? value : null;
  } finally {
    database.close();
  }
}

export async function saveResumeWorkspace(
  resumeId: string,
  resume: ResumeDocument,
  library: ResumeLibrary,
  existingDatabase?: IDBDatabase,
): Promise<void> {
  const database = existingDatabase ?? await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.put(resume, resumeKey(resumeId));
    store.put(library, LIBRARY_KEY);
    transaction.oncomplete = () => {
      if (!existingDatabase) database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function activateResume(library: ResumeLibrary, resumeId: string): Promise<ResumeLibrary> {
  const next = { ...library, activeResumeId: resumeId };
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(next, LIBRARY_KEY);
    transaction.oncomplete = () => { database.close(); resolve(next); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteResume(resumeId: string, library: ResumeLibrary): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.delete(resumeKey(resumeId));
    store.put(library, LIBRARY_KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
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
