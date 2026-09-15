import { isResumeDocument, type ResumeDocument } from "../model/resume";
import type { ResumeLibrary } from "./resumeStorage";

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: "read" | "readwrite";
  }

  interface FileSystemHandle {
    queryPermission(options?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(options?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const DATABASE = "swift-resume";
const STORE = "documents";
const DIRECTORY_HANDLE_KEY = "backup-directory-handle";
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const snapshotKey = (resumeId: string) => `swift-resume:last-disk-snapshot:${resumeId}`;

export type DiskBackupStatus =
  | "unsupported"
  | "not-configured"
  | "permission-required"
  | "ready"
  | "saving"
  | "error";

export interface DiskBackupWorkspace {
  library: ResumeLibrary;
  documents: Array<{ id: string; resume: ResumeDocument }>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isDiskBackupSupported(): boolean {
  return typeof window.showDirectoryPicker === "function";
}

export async function chooseBackupDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) throw new Error("当前浏览器不支持选择本地备份目录");
  const handle = await window.showDirectoryPicker({ id: "swift-resume-backup", mode: "readwrite" });
  await storeBackupDirectory(handle);
  return handle;
}

export async function storeBackupDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(handle, DIRECTORY_HANDLE_KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(DIRECTORY_HANDLE_KEY);
    request.onsuccess = () => {
      const value = request.result as Partial<FileSystemDirectoryHandle> | undefined;
      resolve(value?.kind === "directory" && typeof value.getFileHandle === "function" ? value as FileSystemDirectoryHandle : null);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function queryBackupPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return handle.queryPermission({ mode: "readwrite" });
}

export async function requestBackupPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if (await queryBackupPermission(handle) === "granted") return true;
  return await handle.requestPermission({ mode: "readwrite" }) === "granted";
}

async function writeJson(directory: FileSystemDirectoryHandle, name: string, value: unknown) {
  const file = await directory.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

async function readJson(directory: FileSystemDirectoryHandle, name: string): Promise<unknown> {
  const file = await directory.getFileHandle(name);
  return JSON.parse(await (await file.getFile()).text()) as unknown;
}

export function shouldCreateSnapshot(lastSnapshotAt: number | null, now: number): boolean {
  return lastSnapshotAt === null || now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS;
}

export async function backupResumeToDirectory(
  directory: FileSystemDirectoryHandle,
  resumeId: string,
  resume: ResumeDocument,
  library: ResumeLibrary,
  forceSnapshot = false,
): Promise<void> {
  if (await queryBackupPermission(directory) !== "granted") throw new DOMException("本地备份目录需要重新授权", "NotAllowedError");
  const resumesDirectory = await directory.getDirectoryHandle("resumes", { create: true });
  const existing = await readJson(resumesDirectory, `${resumeId}.swiftresume.json`).catch(() => null);
  if (isResumeDocument(existing) && Date.parse(existing.updatedAt) > Date.parse(resume.updatedAt)) return;

  await writeJson(resumesDirectory, `${resumeId}.swiftresume.json`, resume);
  await writeJson(directory, "index.swiftresume.json", library);

  const now = Date.now();
  const previous = Number(localStorage.getItem(snapshotKey(resumeId)));
  const lastSnapshotAt = Number.isFinite(previous) && previous > 0 ? previous : null;
  if (!forceSnapshot && !shouldCreateSnapshot(lastSnapshotAt, now)) return;
  const historyDirectory = await directory.getDirectoryHandle("history", { create: true });
  const resumeHistory = await historyDirectory.getDirectoryHandle(resumeId, { create: true });
  const timestamp = new Date(now).toISOString().replaceAll(":", "-");
  await writeJson(resumeHistory, `${timestamp}.swiftresume.json`, resume);
  localStorage.setItem(snapshotKey(resumeId), String(now));
}

export async function readDiskBackup(directory: FileSystemDirectoryHandle): Promise<DiskBackupWorkspace> {
  const index = await readJson(directory, "index.swiftresume.json") as Partial<ResumeLibrary>;
  if (index.version !== 1 || typeof index.activeResumeId !== "string" || !Array.isArray(index.resumes)) {
    throw new Error("所选目录中没有有效的 SwiftResume 备份索引");
  }
  const resumesDirectory = await directory.getDirectoryHandle("resumes");
  const documents: DiskBackupWorkspace["documents"] = [];
  for (const summary of index.resumes) {
    if (!summary || typeof summary.id !== "string") continue;
    const value = await readJson(resumesDirectory, `${summary.id}.swiftresume.json`).catch(() => null);
    if (isResumeDocument(value)) documents.push({ id: summary.id, resume: value });
  }
  if (!documents.length) throw new Error("备份索引存在，但没有找到可恢复的简历文件");
  const ids = new Set(documents.map((item) => item.id));
  const library: ResumeLibrary = {
    version: 1,
    activeResumeId: ids.has(index.activeResumeId) ? index.activeResumeId : documents[0].id,
    resumes: index.resumes.filter((item) => ids.has(item.id)),
  };
  return { library, documents };
}
