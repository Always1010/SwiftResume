import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BackupSetupPrompt } from "./components/BackupSetupPrompt";
import { HistoryPanel } from "./components/HistoryPanel";
import { HistoryActions } from "./components/HistoryActions";
import { ResumeLibraryDialog } from "./components/ResumeLibraryDialog";
import { NewResumeDialog } from "./components/NewResumeDialog";
import { PhotoBackgroundPicker } from "./components/PhotoBackgroundPicker";
import { ResumeEditorCanvas } from "./components/ResumeEditorCanvas";
import { ResumePreview } from "./components/ResumePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { TemplatePickerDialog } from "./components/TemplatePickerDialog";
import { PdfExportDialog } from "./components/PdfExportDialog";
import { ResumeCheckDialog } from "./components/ResumeCheckDialog";
import { VersionsDialog } from "./components/VersionsDialog";
import { TextImportDialog } from "./components/TextImportDialog";
import { RestoreDialog } from "./components/RestoreDialog";
import { createLibraryBackup, downloadJson, mergeImportedDocuments, parseBackupValue, type ImportBatch, type ImportDocument } from "./storage/libraryBackup";
import { exportRecord } from "./model/resumeVersions";
import { clearResumeContent, createBlankResume, createResumeFromTemplate, duplicateResume, normalizeResumeDocument, type ResumeAction, type ResumeCreationTemplate, type ResumeDocument, type ResumeSection } from "./model/resume";
import { createResumeHistory, resumeHistoryReducer } from "./model/resumeHistory";
import { loadSettings, saveSettings, subscribeToSettings, type AppSettings } from "./settings/appSettings";
import {
  activateResume,
  createResumeSummary,
  deleteResume,
  downloadResume,
  loadResumeById,
  loadResumeWorkspace,
  saveResumeWorkspace,
  saveDocuments,
  updateResumeSummary,
  type ResumeLibrary,
} from "./storage/resumeStorage";
import {
  backupResumeToDirectory,
  chooseBackupDirectory,
  isDiskBackupSupported,
  loadBackupDirectory,
  queryBackupPermission,
  readDiskBackup,
  requestBackupPermission,
  type DiskBackupStatus,
} from "./storage/diskBackup";
import { useResumeSync } from "./sync/resumeSync";
import { usePreviewPublisher } from "./sync/previewSync";

export function App() {
  const [editHistory, dispatchHistory] = useReducer(resumeHistoryReducer, undefined, () => createResumeHistory(createBlankResume()));
  const resume = editHistory.present;
  const dispatch = useCallback((action: ResumeAction) => {
    dispatchHistory(action.type === "replace" ? { type: "reset", document: action.value } : { type: "edit", action, time: Date.now() });
  }, []);
  const [library, setLibrary] = useState<ResumeLibrary | null>(null);
  const [selectedId, setSelectedId] = useState("profile");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [pageCount, setPageCount] = useState(1);
  const [pdfResume, setPdfResume] = useState<ResumeDocument | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [textImportOpen, setTextImportOpen] = useState(false);
  const [importBatch, setImportBatch] = useState<ImportBatch | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newResumeOpen, setNewResumeOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(() => window.innerWidth >= 1500);
  const [compactWorkspace, setCompactWorkspace] = useState(() => window.innerWidth < 1100);
  const [mobilePreview, setMobilePreview] = useState(false);
  const previewVisible = compactWorkspace ? mobilePreview : settings.previewOpen;
  const [backupDirectory, setBackupDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupStatus, setBackupStatus] = useState<DiskBackupStatus>(() => isDiskBackupSupported() ? "not-configured" : "unsupported");
  const [backupPromptOpen, setBackupPromptOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const firstRunRef = useRef(false);
  const libraryRef = useRef<ResumeLibrary | null>(null);
  libraryRef.current = library;
  const activeResumeId = library?.activeResumeId ?? "";
  const undoLabel = editHistory.past.at(-1)?.label;
  const redoLabel = editHistory.future.at(-1)?.label;
  const changeHistory = useCallback((type: "undo" | "redo") => {
    setEditingId(null);
    dispatchHistory({ type, time: Date.now() });
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented || !(event.ctrlKey || event.metaKey)) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable]")));
      if (typing && !event.altKey) return;
      const key = event.key.toLowerCase();
      const type = key === "z" ? event.shiftKey ? "redo" : "undo" : key === "y" ? "redo" : null;
      if (!type) return;
      event.preventDefault();
      if (type === "undo" ? undoLabel : redoLabel) changeHistory(type);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeHistory, undoLabel, redoLabel]);

  useEffect(() => {
    let active = true;
    loadResumeWorkspace().then((workspace) => {
      if (active) {
        setLibrary(workspace.library);
        dispatch({ type: "replace", value: workspace.resume });
        if (workspace.firstRun) { firstRunRef.current = true; setNewResumeOpen(true); }
      }
    }).catch(() => setSaveState("error")).finally(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeToSettings(setSettings), []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1099px)");
    const update = () => setCompactWorkspace(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDiskBackupSupported()) return;
    let active = true;
    loadBackupDirectory().then(async (handle) => {
      if (!active) return;
      if (!handle) {
        setBackupStatus("not-configured");
        if (settings.diskBackupEnabled) setBackupPromptOpen(true);
        return;
      }
      setBackupDirectory(handle);
      const status = await queryBackupPermission(handle) === "granted" ? "ready" : "permission-required";
      setBackupStatus(status);
      if (status === "permission-required" && settings.diskBackupEnabled) setBackupPromptOpen(true);
    }).catch(() => {
      if (!active) return;
      setBackupStatus("error");
      if (settings.diskBackupEnabled) setBackupPromptOpen(true);
    });
    return () => { active = false; };
  }, [settings.diskBackupEnabled]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!ready) return;
    setSaveState("saving");
    if (!activeResumeId || !libraryRef.current) return;
    const nextLibrary = updateResumeSummary(libraryRef.current, activeResumeId, resume);
    if (nextLibrary !== libraryRef.current) {
      libraryRef.current = nextLibrary;
      setLibrary(nextLibrary);
    }
    const timer = window.setTimeout(() => {
      saveResumeWorkspace(activeResumeId, resume, nextLibrary).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, settings.saveDelayMs);
    return () => window.clearTimeout(timer);
  }, [activeResumeId, ready, resume, settings.saveDelayMs]);

  useEffect(() => {
    if (!ready || !settings.diskBackupEnabled || !backupDirectory || !activeResumeId || !libraryRef.current) return;
    const timer = window.setTimeout(() => {
      const currentLibrary = libraryRef.current;
      if (!currentLibrary) return;
      const nextLibrary = updateResumeSummary(currentLibrary, activeResumeId, resume);
      setBackupStatus("saving");
      backupResumeToDirectory(backupDirectory, activeResumeId, resume, nextLibrary)
        .then(() => setBackupStatus("ready"))
        .catch((error: unknown) => {
          const status = error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error";
          setBackupStatus(status);
          setBackupPromptOpen(true);
        });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [activeResumeId, backupDirectory, ready, resume, settings.diskBackupEnabled]);

  useEffect(() => {
    if (selectedId !== "profile" && !resume.sections.some((section) => section.id === selectedId)) setSelectedId("profile");
  }, [resume.sections, selectedId]);

  const setSections = (sections: ResumeSection[]) => dispatch({ type: "set-sections", value: sections });
  const updateSection = (section: ResumeSection) => setSections(resume.sections.map((item) => item.id === section.id ? section : item));
  const removeSection = (sectionId: string) => {
    const section = resume.sections.find((item) => item.id === sectionId);
    if (!section) return;
    setSections(resume.sections.filter((item) => item.id !== sectionId));
  };
  const persistCurrentResume = async () => {
    const currentLibrary = libraryRef.current;
    if (!currentLibrary || !activeResumeId) return currentLibrary;
    const nextLibrary = updateResumeSummary(currentLibrary, activeResumeId, resume);
    await saveResumeWorkspace(activeResumeId, resume, nextLibrary);
    libraryRef.current = nextLibrary;
    setLibrary(nextLibrary);
    return nextLibrary;
  };
  const commitInlineEdit = () => {
    setSaveState("saving");
    void persistCurrentResume()
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  };
  const closeInlineEditor = () => {
    if (!editingId) return;
    commitInlineEdit();
    setEditingId(null);
  };
  const editResumeBlock = (id: string) => {
    if (editingId === id) {
      setSelectedId(id);
      return;
    }
    if (editingId) commitInlineEdit();
    setSelectedId(id);
    setEditingId(id);
  };
  const locateResumeBlock = (id: string) => {
    if (compactWorkspace) { setMobilePreview(false); setModulesOpen(false); }
    const targetVisible = id === "profile" || resume.sections.some((section) => section.id === id && section.enabled);
    if (targetVisible) editResumeBlock(id);
    else {
      closeInlineEditor();
      setSelectedId(id);
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`resume-block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };
  const switchResume = async (resumeId: string) => {
    if (resumeId === activeResumeId) return;
    setSaveState("saving");
    try {
      const currentLibrary = await persistCurrentResume();
      if (!currentLibrary) return;
      const target = await loadResumeById(resumeId);
      if (!target) throw new Error("找不到所选简历");
      const nextLibrary = await activateResume(currentLibrary, resumeId);
      libraryRef.current = nextLibrary;
      setLibrary(nextLibrary);
      dispatch({ type: "replace", value: target });
      setSelectedId("profile");
      setEditingId(null);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      throw error;
    }
  };
  const addResume = async (document: ResumeDocument) => {
    const currentLibrary = await persistCurrentResume();
    if (!currentLibrary) return;
    const id = crypto.randomUUID();
    const nextLibrary: ResumeLibrary = {
      ...currentLibrary,
      activeResumeId: id,
      resumes: [...currentLibrary.resumes, createResumeSummary(id, document)],
    };
    await saveResumeWorkspace(id, document, nextLibrary);
    libraryRef.current = nextLibrary;
    setLibrary(nextLibrary);
    dispatch({ type: "replace", value: document });
    setSelectedId("profile");
    setEditingId(null);
    setSaveState("saved");
  };
  const createResume = (template: ResumeCreationTemplate, withExamples = true) => {
    setNewResumeOpen(false);
    if (firstRunRef.current) {
      firstRunRef.current = false;
      dispatch({ type: "replace", value: createResumeFromTemplate(template, withExamples) });
      setSelectedId("profile"); setEditingId(null);
      return;
    }
    void addResume(createResumeFromTemplate(template, withExamples)).catch((error) => {
      setSaveState("error");
      window.alert(error instanceof Error ? error.message : "新建简历失败");
    });
  };
  const clearContent = () => {
    if (!window.confirm("清空这份简历的个人信息与正文，保留模块结构和排版？操作后可以撤销。")) return;
    dispatchHistory({ type: "edit", action: { type: "replace", value: clearResumeContent(resume) }, time: Date.now() });
    setSelectedId("profile"); setEditingId("profile");
  };
  const copyResume = async (id: string) => {
    const document = id === activeResumeId ? resume : await loadResumeById(id);
    if (!document) throw new Error("找不到要复制的简历");
    await addResume(duplicateResume(document));
  };
  const renameResume = async (id: string, title: string) => {
    if (id === activeResumeId) {
      const current = await persistCurrentResume();
      if (!current) throw new Error("简历库尚未就绪");
      const document = { ...resume, title, updatedAt: new Date().toISOString() };
      const next = updateResumeSummary(current, id, document);
      await saveDocuments([{ id, resume: document }], next);
      libraryRef.current = next; setLibrary(next);
      dispatch({ type: "update-title", value: title });
      return;
    }
    const current = await persistCurrentResume();
    const document = await loadResumeById(id);
    if (!current || !document) throw new Error("找不到要重命名的简历");
    const renamed = { ...document, title, updatedAt: new Date().toISOString() };
    const next = updateResumeSummary(current, id, renamed);
    await saveDocuments([{ id, resume: renamed }], next);
    libraryRef.current = next; setLibrary(next);
  };
  const removeLibraryResume = async (id: string) => {
    const summary = libraryRef.current?.resumes.find((item) => item.id === id);
    if (!summary || !libraryRef.current || libraryRef.current.resumes.length <= 1) return;
    if (!window.confirm(`确定删除“${summary.title}”吗？此操作不会删除手动导出的备份。`)) return;
    const current = await persistCurrentResume();
    if (!current) throw new Error("简历库尚未就绪");
    const remaining = current.resumes.filter((item) => item.id !== id);
    const nextId = id === activeResumeId ? remaining[0].id : activeResumeId;
    const target = id === activeResumeId ? await loadResumeById(nextId) : null;
    if (id === activeResumeId && !target) throw new Error("无法读取下一份简历");
    const nextLibrary: ResumeLibrary = { ...current, activeResumeId: nextId, resumes: remaining };
    await deleteResume(id, nextLibrary);
    libraryRef.current = nextLibrary; setLibrary(nextLibrary);
    if (target) { dispatch({ type: "replace", value: target }); setSelectedId("profile"); setEditingId(null); }
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error("备份文件超过 100MB，请分批导入");
      setImportBatch(parseBackupValue(JSON.parse(await file.text())));
      setLibraryOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "导入失败");
    }
  };
  const restoreSelected = async (documents: ImportDocument[]) => {
    const current = await persistCurrentResume();
    if (!current) throw new Error("简历库尚未就绪");
    const merged = mergeImportedDocuments(current, documents);
    await saveDocuments(merged.documents, merged.library);
    libraryRef.current = merged.library; setLibrary(merged.library);
    dispatch({ type: "replace", value: merged.documents[0].resume });
    setSelectedId("profile"); setEditingId(null); setImportBatch(null); setSaveState("saved");
  };
  const exportLibrary = async () => {
    try {
      const current = await persistCurrentResume();
      if (!current) throw new Error("简历库尚未就绪");
      downloadJson(await createLibraryBackup(current), `SwiftResume-整库-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) { window.alert(e instanceof Error ? e.message : "整库备份失败"); }
  };
  const backupAllResumes = async (directory: FileSystemDirectoryHandle, forceSnapshot = false) => {
    const currentLibrary = libraryRef.current;
    if (!currentLibrary) return;
    const nextLibrary = updateResumeSummary(currentLibrary, activeResumeId, resume);
    for (const summary of nextLibrary.resumes) {
      const document = summary.id === activeResumeId ? resume : await loadResumeById(summary.id);
      if (document) await backupResumeToDirectory(directory, summary.id, document, nextLibrary, forceSnapshot);
    }
  };
  const selectBackupDirectory = async () => {
    try {
      const directory = await chooseBackupDirectory();
      setBackupDirectory(directory);
      setSettings((current) => ({ ...current, diskBackupEnabled: true }));
      setBackupStatus("saving");
      await backupAllResumes(directory, true);
      setBackupStatus("ready");
      setBackupPromptOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setBackupStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error");
      window.alert(error instanceof Error ? error.message : "选择备份目录失败");
    }
  };
  const authorizeBackupDirectory = async () => {
    if (!backupDirectory) return;
    try {
      if (!await requestBackupPermission(backupDirectory)) {
        setBackupStatus("permission-required");
        return;
      }
      setBackupStatus("saving");
      await backupAllResumes(backupDirectory);
      setBackupStatus("ready");
      setBackupPromptOpen(false);
    } catch (error) {
      setBackupStatus("error");
      window.alert(error instanceof Error ? error.message : "授权备份目录失败");
    }
  };
  const backupNow = async () => {
    if (!backupDirectory) return;
    try {
      setBackupStatus("saving");
      await backupAllResumes(backupDirectory);
      setBackupStatus("ready");
    } catch (error) {
      setBackupStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error");
      window.alert(error instanceof Error ? error.message : "磁盘备份失败");
    }
  };
  const restoreBackup = async () => {
    if (!backupDirectory) return;
    try {
      if (!await requestBackupPermission(backupDirectory)) {
        setBackupStatus("permission-required");
        return;
      }
      const restored = await readDiskBackup(backupDirectory);
      setImportBatch(parseBackupValue({ format: "swift-resume-library", version: 1, documents: restored.documents }));
      setSettingsOpen(false);
      setBackupStatus("ready");
      setSaveState("saved");
    } catch (error) {
      setBackupStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error");
      window.alert(error instanceof Error ? error.message : "恢复磁盘备份失败");
    }
  };
  const createHistorySnapshot = async (resumeId: string) => {
    const currentLibrary = libraryRef.current;
    if (!backupDirectory || !currentLibrary) throw new Error("尚未设置可用的备份目录");
    const document = resumeId === activeResumeId ? resume : await loadResumeById(resumeId);
    if (!document) throw new Error("找不到要创建历史版本的简历");
    const nextLibrary = resumeId === activeResumeId
      ? updateResumeSummary(currentLibrary, resumeId, document)
      : currentLibrary;
    setBackupStatus("saving");
    await backupResumeToDirectory(backupDirectory, resumeId, document, nextLibrary, true);
    setBackupStatus("ready");
  };
  const restoreHistoryAsNew = async (document: ResumeDocument) => {
    const restored = structuredClone(document);
    restored.title = `${restored.title || "未命名简历"}（历史恢复）`;
    restored.updatedAt = new Date().toISOString();
    await addResume(restored);
    setHistoryOpen(false);
  };
  const replaceResumeFromHistory = async (resumeId: string, document: ResumeDocument) => {
    const currentLibrary = libraryRef.current;
    if (!currentLibrary) throw new Error("简历库尚未就绪");
    const currentDocument = resumeId === activeResumeId ? resume : await loadResumeById(resumeId);
    if (!currentDocument) throw new Error("找不到要覆盖的简历");
    if (backupDirectory) {
      await backupResumeToDirectory(backupDirectory, resumeId, currentDocument, currentLibrary, true);
    }
    const restored = structuredClone(document);
    restored.updatedAt = new Date().toISOString();
    const nextLibrary = updateResumeSummary(currentLibrary, resumeId, restored);
    await saveResumeWorkspace(resumeId, restored, nextLibrary);
    libraryRef.current = nextLibrary;
    setLibrary(nextLibrary);
    if (resumeId === activeResumeId) dispatchHistory({ type: "edit", action: { type: "replace", value: restored }, time: Date.now() });
    if (backupDirectory) await backupResumeToDirectory(backupDirectory, resumeId, restored, nextLibrary);
    setBackupStatus(backupDirectory ? "ready" : backupStatus);
    setSaveState("saved");
    setHistoryOpen(false);
  };
  const handlePageCount = useCallback((value: number) => setPageCount(value), []);
  const applyRemoteResume = useCallback((value: ResumeDocument) => {
    const normalized = normalizeResumeDocument(value);
    if (normalized) dispatch({ type: "replace", value: normalized });
  }, []);
  const { supported: syncSupported } = useResumeSync({
    resumeId: activeResumeId,
    resume,
    ready,
    enabled: settings.liveSync,
    delayMs: settings.syncDelayMs,
    onRemoteResume: applyRemoteResume,
  });
  usePreviewPublisher(activeResumeId, resume, ready, applyRemoteResume);

  const openStandalonePreview = () => {
    if (!activeResumeId) return;
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("view", "preview");
    url.searchParams.set("resumeId", activeResumeId);
    window.open(url.toString(), `swift-resume-preview-${activeResumeId}`)?.focus();
  };
  const exportPdf = () => {
    if (settings.exportEngine === "browser") {
      window.print();
      return;
    }
    setPdfResume(resume);
  };

  if (!ready) return <main className="startup-status" role="status">正在打开本机简历库…</main>;

  return (
    <div className="app-shell">
      <header className="topbar workspace-topbar">
        <div className="brand"><span className="brand-mark">S</span><strong>SwiftResume</strong></div>
        <div className="current-document">
          <button type="button" className="document-switcher" aria-label={`我的简历：${resume.title || "未命名简历"}`} aria-haspopup="dialog" aria-expanded={libraryOpen} disabled={!library} onClick={() => setLibraryOpen(true)}><span>{resume.title || "未命名简历"}</span><span aria-hidden="true">⌄</span></button>
          <span role="status" className={`save-status ${saveState}`}>{saveState === "saved" ? "● 已自动保存" : saveState === "saving" ? "● 保存中" : "● 保存失败"}</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="secondary-button" onClick={() => setSettingsOpen(true)}>设置</button>
          <button type="button" className="primary-button export-button" disabled={!ready} onClick={() => setCheckOpen(true)}>导出 PDF</button>
        </div>
      </header>
      <input ref={importRef} hidden type="file" accept=".json" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
      <nav className="workspace-controls" aria-label="工作区布局">
        <button type="button" className="secondary-button" aria-expanded={modulesOpen} onClick={() => setModulesOpen(!modulesOpen)}>{modulesOpen ? "收起模块" : "简历模块"}</button>
        <button type="button" className="secondary-button" disabled={!ready} onClick={() => setTemplatePickerOpen(true)}>排版样式</button>
        {compactWorkspace ? <details className="workspace-more"><summary className="secondary-button">更多</summary><div className="workspace-more-panel">
        <button type="button" className="secondary-button" disabled={!library} onClick={() => setVersionsOpen(true)}>岗位版本</button>
        <HistoryActions undoLabel={undoLabel} redoLabel={redoLabel} onUndo={() => changeHistory("undo")} onRedo={() => changeHistory("redo")} />
        </div></details> : <div className="workspace-secondary-tools">
        <button type="button" className="secondary-button" disabled={!library} onClick={() => setVersionsOpen(true)}>岗位版本</button>
        <HistoryActions undoLabel={undoLabel} redoLabel={redoLabel} onUndo={() => changeHistory("undo")} onRedo={() => changeHistory("redo")} />
        </div>}
        <div className="workspace-view-options">
          <button type="button" className={`secondary-button ${!previewVisible ? "active" : ""}`} aria-pressed={!previewVisible} onClick={() => { setMobilePreview(false); setSettings((current) => ({ ...current, previewOpen: false })); }}>专注编辑</button>
          <button type="button" className={`secondary-button ${previewVisible ? "active" : ""}`} aria-pressed={previewVisible} onClick={() => { setMobilePreview(true); setSettings((current) => ({ ...current, previewOpen: true })); }}>{compactWorkspace ? "查看预览" : "编辑＋预览"}</button>
        </div>
      </nav>
      <div className={`workspace ${previewVisible ? "" : "preview-hidden"} ${modulesOpen ? "modules-open" : "modules-hidden"} ${compactWorkspace && previewVisible ? "mobile-preview" : ""}`}>
        {modulesOpen && <Sidebar resume={resume} selectedId={selectedId} onSelect={locateResumeBlock} onAdd={(section) => {
          setSections([...resume.sections, section]);
          if (compactWorkspace) { setMobilePreview(false); setModulesOpen(false); }
          editResumeBlock(section.id);
          window.requestAnimationFrame(() => document.getElementById(`resume-block-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }} onSectionsChange={setSections} onDeleteSection={removeSection} />}
        <ResumeEditorCanvas
          key={activeResumeId}
          resume={resume}
          selectedId={selectedId}
          editingId={editingId}
          onEdit={editResumeBlock}
          onCloseEditor={closeInlineEditor}
          onClearContent={clearContent}
          onProfileChange={(value) => dispatch({ type: "update-profile", value })}
          onSectionChange={updateSection}
          onDeleteSection={removeSection}
        />
        {previewVisible ? (
          <section className="preview-panel">
            <div className="preview-toolbar">
              <div className="preview-toolbar-leading">
                {settings.showOverflowWarning && <span className="page-count-badge">共 {pageCount} 页</span>}
                <select aria-label="预览缩放" value={settings.previewZoom} onChange={(event) => {
                  const previewZoom = event.target.value === "fit" ? "fit" : Number(event.target.value) as 70 | 80 | 90 | 100;
                  setSettings((current) => ({ ...current, previewZoom }));
                }}>
                  <option value="fit">适应宽度</option>
                  {[70, 80, 90, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
                </select>
              </div>
              <button type="button" className="secondary-button" onClick={openStandalonePreview}>↗ 独立预览</button>
              <label className="density-control">
                <span>紧凑</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="排版密度"
                  value={resume.theme.density}
                  onChange={(event) => dispatch({ type: "update-theme", value: { density: Number(event.target.value) } })}
                />
                <span>宽松</span>
                <output>{resume.theme.density}</output>
              </label>
              <label className="accent-picker" title="强调色"><span>配色</span><input type="color" value={resume.theme.accent} onChange={(event) => dispatch({ type: "update-theme", value: { accent: event.target.value } })} /></label>
              <PhotoBackgroundPicker
                compact
                value={resume.profile.photoBackground}
                disabled={!resume.profile.photo}
                onChange={(photoBackground) => dispatch({ type: "update-profile", value: { ...resume.profile, photoBackground } })}
              />
            </div>
            <ResumePreview resume={resume} zoom={settings.previewZoom} onPageCountChange={handlePageCount} />
          </section>
        ) : null}
      </div>
      {!previewVisible && <div className="print-preview" aria-hidden="true"><ResumePreview resume={resume} zoom={100} /></div>}
      {checkOpen && <ResumeCheckDialog resume={resume} onClose={() => setCheckOpen(false)} onContinue={() => { setCheckOpen(false); exportPdf(); }} onLocate={(id) => { setCheckOpen(false); locateResumeBlock(id); }} />}
      {pdfResume && <PdfExportDialog resume={pdfResume} onDownloaded={(filename) => dispatch({ type: "record-export", value: exportRecord(pdfResume, filename) })} onClose={() => setPdfResume(null)} onBrowserPrint={() => {
        setPdfResume(null);
        window.requestAnimationFrame(() => window.print());
      }} />}
      {undoLabel === "删除模块" && <div className="undo-notice" role="status">模块已删除<button type="button" onClick={() => changeHistory("undo")}>撤销删除</button></div>}
      {settingsOpen && <SettingsPanel
        settings={settings}
        syncSupported={syncSupported}
        backupSupported={isDiskBackupSupported()}
        backupStatus={backupStatus}
        backupDirectoryName={backupDirectory?.name ?? ""}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onChooseBackupDirectory={() => void selectBackupDirectory()}
        onAuthorizeBackupDirectory={() => void authorizeBackupDirectory()}
        onBackupNow={() => void backupNow()}
        onRestoreBackup={() => void restoreBackup()}
        onOpenHistory={() => { setSettingsOpen(false); setHistoryOpen(true); }}
      />}
      {historyOpen && backupDirectory && library && <HistoryPanel
        directory={backupDirectory}
        resumes={library.resumes}
        initialResumeId={activeResumeId}
        onClose={() => setHistoryOpen(false)}
        onCreateSnapshot={createHistorySnapshot}
        onRestoreAsNew={restoreHistoryAsNew}
        onReplaceResume={replaceResumeFromHistory}
      />}
      {libraryOpen && library && <ResumeLibraryDialog library={updateResumeSummary(library, activeResumeId, resume)} onClose={() => setLibraryOpen(false)} onNew={() => { setLibraryOpen(false); setNewResumeOpen(true); }} onOpen={switchResume} onRename={renameResume} onCopy={copyResume} onDelete={removeLibraryResume} onClear={clearContent} backupTools={<div className="library-backup-tools">
          <span className={`disk-status ${backupStatus}`} title={backupDirectory ? `备份目录：${backupDirectory.name}` : "尚未选择本地备份目录"}>
            {backupStatus === "ready" ? "● 磁盘已备份" : backupStatus === "saving" ? "● 磁盘备份中" : backupStatus === "permission-required" ? "● 磁盘待授权" : backupStatus === "error" ? "● 磁盘备份失败" : backupStatus === "unsupported" ? "磁盘备份不支持" : "磁盘未配置"}
          </span>
          <span className={`sync-status ${settings.liveSync && syncSupported ? "active" : ""}`} title={syncSupported ? "多个 SwiftResume 页面实时同步" : "当前浏览器不支持多页面同步"}>
            <span />{settings.liveSync && syncSupported ? "多页同步" : "同步关闭"}
          </span>
          <button type="button" className="secondary-button" onClick={() => downloadResume(resume)}>备份当前简历</button>
          <button type="button" className="secondary-button" disabled={!library} onClick={() => void exportLibrary()}>备份全部简历</button>
          <button type="button" className="secondary-button" onClick={() => importRef.current?.click()}>导入 JSON 备份</button>
          <button type="button" className="secondary-button" disabled={!library} onClick={() => { setLibraryOpen(false); setTextImportOpen(true); }}>粘贴旧简历文本</button>
<button type="button" className="secondary-button" onClick={() => { setLibraryOpen(false); setSettingsOpen(true); }}>磁盘备份设置与历史恢复</button>
      </div>} />}
      {newResumeOpen && <NewResumeDialog onSelect={createResume} onClose={() => { firstRunRef.current = false; setNewResumeOpen(false); }} />}
      {textImportOpen && <TextImportDialog onClose={() => setTextImportOpen(false)} onImport={async (document) => { await addResume(document); setTextImportOpen(false); }} />}
      {importBatch && <RestoreDialog batch={importBatch} onClose={() => setImportBatch(null)} onRestore={restoreSelected} />}
      {versionsOpen && library && <VersionsDialog resume={resume} library={library} onClose={() => setVersionsOpen(false)} onUpdate={(value) => dispatch({ type: "update-target", value })} onCreate={async (document) => { await addResume(document); setVersionsOpen(false); }} onSyncContacts={async (ids) => {
        const currentLibrary = await persistCurrentResume();
        if (!currentLibrary) throw new Error("简历库尚未就绪");
        const documents = await Promise.all(ids.map(async (id) => {
          const document = await loadResumeById(id);
          if (!document) throw new Error("无法读取部分所选版本，尚未写入任何变更");
          return { id, resume: { ...document, profile: { ...document.profile, phone: resume.profile.phone, email: resume.profile.email, location: resume.profile.location }, updatedAt: new Date().toISOString() } };
        }));
        const next = documents.reduce((lib, item) => updateResumeSummary(lib, item.id, item.resume), currentLibrary);
        await saveDocuments(documents, next); libraryRef.current = next; setLibrary(next);
      }} />}
      {templatePickerOpen && <TemplatePickerDialog resume={resume} onClose={() => setTemplatePickerOpen(false)} onApply={(theme) => {
        dispatch({ type: "update-theme", value: theme });
        setTemplatePickerOpen(false);
      }} />}
      {backupPromptOpen && !newResumeOpen && backupStatus !== "unsupported" && <BackupSetupPrompt
        status={backupStatus}
        directoryName={backupDirectory?.name ?? ""}
        onChooseDirectory={() => void selectBackupDirectory()}
        onAuthorizeDirectory={() => void authorizeBackupDirectory()}
        onLater={() => setBackupPromptOpen(false)}
      />}
    </div>
  );
}
