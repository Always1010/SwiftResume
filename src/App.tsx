import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { EditorPanel } from "./components/EditorPanel";
import { ResumePreview } from "./components/ResumePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { exportTypstPdf } from "./export/typstPdf";
import { createBlankResume, createDefaultResume, duplicateResume, resumeReducer, type Density, type ResumeDocument, type ResumeSection } from "./model/resume";
import { loadSettings, saveSettings, subscribeToSettings, type AppSettings } from "./settings/appSettings";
import {
  activateResume,
  createResumeSummary,
  deleteResume,
  downloadResume,
  loadResumeById,
  loadResumeWorkspace,
  parseResumeFile,
  saveResumeWorkspace,
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

const densityLabels: Record<Density, string> = { comfortable: "宽松", standard: "标准", compact: "紧凑" };

export function App() {
  const [resume, dispatch] = useReducer(resumeReducer, undefined, createDefaultResume);
  const [library, setLibrary] = useState<ResumeLibrary | null>(null);
  const [selectedId, setSelectedId] = useState("profile");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [overflow, setOverflow] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [backupDirectory, setBackupDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupStatus, setBackupStatus] = useState<DiskBackupStatus>(() => isDiskBackupSupported() ? "not-configured" : "unsupported");
  const importRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<ResumeLibrary | null>(null);
  libraryRef.current = library;
  const activeResumeId = library?.activeResumeId ?? "";

  useEffect(() => {
    let active = true;
    loadResumeWorkspace().then((workspace) => {
      if (active) {
        setLibrary(workspace.library);
        dispatch({ type: "replace", value: workspace.resume });
      }
    }).catch(() => setSaveState("error")).finally(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeToSettings(setSettings), []);

  useEffect(() => {
    if (!isDiskBackupSupported()) return;
    let active = true;
    loadBackupDirectory().then(async (handle) => {
      if (!active || !handle) return;
      setBackupDirectory(handle);
      setBackupStatus(await queryBackupPermission(handle) === "granted" ? "ready" : "permission-required");
    }).catch(() => active && setBackupStatus("error"));
    return () => { active = false; };
  }, []);

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
        .catch((error: unknown) => setBackupStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error"));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [activeResumeId, backupDirectory, ready, resume, settings.diskBackupEnabled]);

  useEffect(() => {
    if (selectedId !== "profile" && !resume.sections.some((section) => section.id === selectedId)) setSelectedId("profile");
  }, [resume.sections, selectedId]);

  const setSections = (sections: ResumeSection[]) => dispatch({ type: "set-sections", value: sections });
  const updateSection = (section: ResumeSection) => setSections(resume.sections.map((item) => item.id === section.id ? section : item));
  const persistCurrentResume = async () => {
    const currentLibrary = libraryRef.current;
    if (!currentLibrary || !activeResumeId) return currentLibrary;
    const nextLibrary = updateResumeSummary(currentLibrary, activeResumeId, resume);
    await saveResumeWorkspace(activeResumeId, resume, nextLibrary);
    libraryRef.current = nextLibrary;
    setLibrary(nextLibrary);
    return nextLibrary;
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
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(error instanceof Error ? error.message : "切换简历失败");
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
    setSaveState("saved");
  };
  const createResume = () => {
    void addResume(createBlankResume()).catch((error) => {
      setSaveState("error");
      window.alert(error instanceof Error ? error.message : "新建简历失败");
    });
  };
  const copyResume = () => {
    void addResume(duplicateResume(resume)).catch((error) => {
      setSaveState("error");
      window.alert(error instanceof Error ? error.message : "复制简历失败");
    });
  };
  const removeCurrentResume = async () => {
    const currentLibrary = libraryRef.current;
    if (!currentLibrary || currentLibrary.resumes.length <= 1) return;
    if (!window.confirm(`确定删除“${resume.title}”吗？此操作不会删除手动导出的备份。`)) return;
    const remaining = currentLibrary.resumes.filter((item) => item.id !== activeResumeId);
    const nextId = remaining[0].id;
    const target = await loadResumeById(nextId);
    if (!target) throw new Error("无法读取下一份简历");
    const nextLibrary: ResumeLibrary = { ...currentLibrary, activeResumeId: nextId, resumes: remaining };
    await deleteResume(activeResumeId, nextLibrary);
    libraryRef.current = nextLibrary;
    setLibrary(nextLibrary);
    dispatch({ type: "replace", value: target });
    setSelectedId("profile");
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await addResume(await parseResumeFile(file));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "导入失败");
    }
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
      if (!window.confirm(`将从磁盘恢复 ${restored.documents.length} 份简历，并替换当前浏览器简历库。是否继续？`)) return;
      for (const item of restored.documents) {
        await saveResumeWorkspace(item.id, item.resume, restored.library);
      }
      const activeDocument = restored.documents.find((item) => item.id === restored.library.activeResumeId)?.resume
        ?? restored.documents[0].resume;
      libraryRef.current = restored.library;
      setLibrary(restored.library);
      dispatch({ type: "replace", value: activeDocument });
      setSelectedId("profile");
      setBackupStatus("ready");
      setSaveState("saved");
    } catch (error) {
      setBackupStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "permission-required" : "error");
      window.alert(error instanceof Error ? error.message : "恢复磁盘备份失败");
    }
  };
  const handleOverflow = useCallback((value: boolean) => setOverflow(value), []);
  const applyRemoteResume = useCallback((value: ResumeDocument) => {
    dispatch({ type: "replace", value });
  }, []);
  const { supported: syncSupported } = useResumeSync({
    resumeId: activeResumeId,
    resume,
    ready,
    enabled: settings.liveSync,
    delayMs: settings.syncDelayMs,
    onRemoteResume: applyRemoteResume,
  });
  const exportPdf = async () => {
    if (settings.exportEngine === "browser") {
      window.print();
      return;
    }
    setExporting(true);
    try {
      await exportTypstPdf(resume);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      window.alert(`Typst PDF 导出失败，将打开浏览器打印作为备用方案。\n\n${message}`);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SwiftResume</strong><small>模块化简历工作台</small></div></div>
        <div className="document-manager">
          <select aria-label="切换简历" value={activeResumeId} disabled={!library} onChange={(event) => void switchResume(event.target.value)}>
            {library?.resumes.map((item) => <option key={item.id} value={item.id}>{item.title || "未命名简历"}</option>)}
          </select>
          <input className="document-title" aria-label="简历文件名" value={resume.title} onChange={(event) => dispatch({ type: "update-title", value: event.target.value })} />
          <div className="document-actions">
            <button type="button" className="icon-button" title="新建空白简历" aria-label="新建空白简历" onClick={createResume}>＋</button>
            <button type="button" className="icon-button" title="创建当前简历的副本" aria-label="创建当前简历的副本" onClick={copyResume}>⧉</button>
            <button type="button" className="icon-button danger-text" title="删除当前简历" aria-label="删除当前简历" disabled={!library || library.resumes.length <= 1} onClick={() => void removeCurrentResume().catch((error) => window.alert(error instanceof Error ? error.message : "删除失败"))}>×</button>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`save-status ${saveState}`}>{saveState === "saved" ? "● 已自动保存" : saveState === "saving" ? "● 保存中" : "● 保存失败"}</span>
          <span className={`disk-status ${backupStatus}`} title={backupDirectory ? `备份目录：${backupDirectory.name}` : "尚未选择本地备份目录"}>
            {backupStatus === "ready" ? "● 磁盘已备份" : backupStatus === "saving" ? "● 磁盘备份中" : backupStatus === "permission-required" ? "● 磁盘待授权" : backupStatus === "error" ? "● 磁盘备份失败" : backupStatus === "unsupported" ? "磁盘备份不支持" : "磁盘未配置"}
          </span>
          <span className={`sync-status ${settings.liveSync && syncSupported ? "active" : ""}`} title={syncSupported ? "多个 SwiftResume 页面实时同步" : "当前浏览器不支持多页面同步"}>
            <span />{settings.liveSync && syncSupported ? "多页同步" : "同步关闭"}
          </span>
          <button
            type="button"
            className={`secondary-button preview-toggle ${previewOpen ? "active" : ""}`}
            aria-pressed={previewOpen}
            onClick={() => setPreviewOpen((value) => !value)}
          >
            {previewOpen ? "关闭预览" : "开启预览"}
          </button>
          <button type="button" className="secondary-button" onClick={() => setSettingsOpen(true)}>设置</button>
          <button type="button" className="secondary-button" onClick={() => downloadResume(resume)}>备份 JSON</button>
          <button type="button" className="secondary-button" onClick={() => importRef.current?.click()}>导入</button>
          <input ref={importRef} hidden type="file" accept=".json" onChange={(event) => void importFile(event.target.files?.[0])} />
          <button type="button" className="primary-button export-button" disabled={exporting} onClick={() => void exportPdf()}>{exporting ? "正在生成…" : "导出 PDF"}</button>
        </div>
      </header>
      <div className={`workspace ${previewOpen ? "" : "preview-hidden"}`}>
        <Sidebar resume={resume} selectedId={selectedId} onSelect={setSelectedId} onSectionsChange={setSections} />
        <EditorPanel resume={resume} selectedId={selectedId} onProfileChange={(value) => dispatch({ type: "update-profile", value })} onSectionChange={updateSection} onDeleteSection={(sectionId) => setSections(resume.sections.filter((section) => section.id !== sectionId))} />
        {previewOpen ? (
          <section className="preview-panel">
            <div className="preview-toolbar">
              <div><strong>A4 实时预览</strong>{settings.showOverflowWarning && <span className={overflow ? "overflow-warning" : "page-ok"}>{overflow ? "内容已超出一页" : "一页内"}</span>}</div>
              <div className="density-switch" aria-label="排版密度">{(Object.keys(densityLabels) as Density[]).map((density) => (
                <button type="button" key={density} className={resume.theme.density === density ? "active" : ""} onClick={() => dispatch({ type: "update-theme", value: { density } })}>{densityLabels[density]}</button>
              ))}</div>
              <label className="accent-picker" title="强调色"><span>配色</span><input type="color" value={resume.theme.accent} onChange={(event) => dispatch({ type: "update-theme", value: { accent: event.target.value } })} /></label>
              <button type="button" className="preview-close-button" aria-label="关闭简历预览" title="关闭预览" onClick={() => setPreviewOpen(false)}>×</button>
            </div>
            <ResumePreview resume={resume} zoom={settings.previewZoom} onOverflowChange={handleOverflow} />
          </section>
        ) : (
          <aside className="preview-collapsed" aria-label="简历预览已关闭">
            <button type="button" onClick={() => setPreviewOpen(true)} title="显示简历预览"><span>▣</span><strong>显示预览</strong></button>
          </aside>
        )}
      </div>
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
      />}
    </div>
  );
}
