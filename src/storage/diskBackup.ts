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

export interface SnapshotState {
  savedAt: number;
  resumeUpdatedAt: string;
}

export interface ProfilePhotoAsset {
  bytes: Uint8Array;
  extension: string;
  mimeType: string;
}

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

async function writeBytes(directory: FileSystemDirectoryHandle, name: string, value: Uint8Array) {
  const file = await directory.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  await writable.write(buffer);
  await writable.close();
}

async function readJson(directory: FileSystemDirectoryHandle, name: string): Promise<unknown> {
  const file = await directory.getFileHandle(name);
  return JSON.parse(await (await file.getFile()).text()) as unknown;
}

export function profilePhotoAsset(photo: string): ProfilePhotoAsset | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(photo);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const extension = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
  }[mimeType] ?? "img";
  try {
    const binary = atob(match[2]);
    return {
      bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
      extension,
      mimeType,
    };
  } catch {
    return null;
  }
}

export function shouldCreateSnapshot(
  previous: SnapshotState | null,
  now: number,
  resumeUpdatedAt: string,
  force = false,
): boolean {
  if (force) return true;
  if (previous?.resumeUpdatedAt === resumeUpdatedAt) return false;
  return previous === null || now - previous.savedAt >= SNAPSHOT_INTERVAL_MS;
}

function loadSnapshotState(resumeId: string): SnapshotState | null {
  const stored = localStorage.getItem(snapshotKey(resumeId));
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<SnapshotState>;
    return typeof value.savedAt === "number" && typeof value.resumeUpdatedAt === "string"
      ? { savedAt: value.savedAt, resumeUpdatedAt: value.resumeUpdatedAt }
      : null;
  } catch {
    return null;
  }
}

async function backupProfilePhoto(
  directory: FileSystemDirectoryHandle,
  resumeId: string,
  resume: ResumeDocument,
) {
  const assetsDirectory = await directory.getDirectoryHandle("assets", { create: true });
  const resumeAssets = await assetsDirectory.getDirectoryHandle(resumeId, { create: true });
  const asset = profilePhotoAsset(resume.profile.photo);
  if (!asset) {
    await writeJson(resumeAssets, "profile-photo.json", { fileName: null, updatedAt: resume.updatedAt });
    return;
  }
  const fileName = `profile-photo.${asset.extension}`;
  await writeBytes(resumeAssets, fileName, asset.bytes);
  await writeJson(resumeAssets, "profile-photo.json", {
    fileName,
    mimeType: asset.mimeType,
    updatedAt: resume.updatedAt,
  });
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
  await backupProfilePhoto(directory, resumeId, resume);

  const now = Date.now();
  const previous = loadSnapshotState(resumeId);
  if (!shouldCreateSnapshot(previous, now, resume.updatedAt, forceSnapshot)) return;
  const historyDirectory = await directory.getDirectoryHandle("history", { create: true });
  const resumeHistory = await historyDirectory.getDirectoryHandle(resumeId, { create: true });
  const timestamp = new Date(now).toISOString().replaceAll(":", "-");
  await writeJson(resumeHistory, `${timestamp}.swiftresume.json`, resume);
  localStorage.setItem(snapshotKey(resumeId), JSON.stringify({ savedAt: now, resumeUpdatedAt: resume.updatedAt } satisfies SnapshotState));
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
