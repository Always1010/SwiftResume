import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BackupSetupPrompt } from "./components/BackupSetupPrompt";
import { HistoryPanel } from "./components/HistoryPanel";
import { NewResumeDialog } from "./components/NewResumeDialog";
import { PhotoBackgroundPicker } from "./components/PhotoBackgroundPicker";
import { ResumeEditorCanvas } from "./components/ResumeEditorCanvas";
import { ResumePreview } from "./components/ResumePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { exportTypstPdf } from "./export/typstPdf";
import { createDefaultResume, createResumeFromTemplate, duplicateResume, normalizeResumeDocument, resumeReducer, type ResumeCreationTemplate, type ResumeDocument, type ResumeSection } from "./model/resume";
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
import { usePreviewPublisher } from "./sync/previewSync";
import { RESUME_TEMPLATES } from "./templates/registry";

export function App() {
  const [resume, dispatch] = useReducer(resumeReducer, undefined, createDefaultResume);
  const [library, setLibrary] = useState<ResumeLibrary | null>(null);
  const [selectedId, setSelectedId] = useState("profile");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [pageCount, setPageCount] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newResumeOpen, setNewResumeOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(() => window.innerWidth >= 1500);
  const [compactWorkspace, setCompactWorkspace] = useState(() => window.innerWidth < 1100);
  const [mobilePreview, setMobilePreview] = useState(false);
  const previewVisible = compactWorkspace ? mobilePreview : settings.previewOpen;
  const [backupDirectory, setBackupDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupStatus, setBackupStatus] = useState<DiskBackupStatus>(() => isDiskBackupSupported() ? "not-configured" : "unsupported");
  const [backupPromptOpen, setBackupPromptOpen] = useState(false);
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
    if (!section || !window.confirm(`确定删除“${section.title}”模块吗？`)) return;
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
    setEditingId(null);
    setSaveState("saved");
  };
  const createResume = (template: ResumeCreationTemplate) => {
    setNewResumeOpen(false);
    void addResume(createResumeFromTemplate(template)).catch((error) => {
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
    setEditingId(null);
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
    if (resumeId === activeResumeId) dispatch({ type: "replace", value: restored });
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
            <button type="button" className="icon-button" title="新建简历" aria-label="新建简历" onClick={() => setNewResumeOpen(true)}>＋</button>
            <button type="button" className="icon-button" title="创建当前简历的副本" aria-label="创建当前简历的副本" onClick={copyResume}>⧉</button>
            <button type="button" className="icon-button danger-text" title="删除当前简历" aria-label="删除当前简历" disabled={!library || library.resumes.length <= 1} onClick={() => void removeCurrentResume().catch((error) => window.alert(error instanceof Error ? error.message : "删除失败"))}>×</button>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`save-status ${saveState}`}>{saveState === "saved" ? "● 已自动保存" : saveState === "saving" ? "● 保存中" : "● 保存失败"}</span>
          <details className="file-menu">
            <summary className="secondary-button">文件与备份</summary>
            <div className="file-menu-content">
          <span className={`disk-status ${backupStatus}`} title={backupDirectory ? `备份目录：${backupDirectory.name}` : "尚未选择本地备份目录"}>
            {backupStatus === "ready" ? "● 磁盘已备份" : backupStatus === "saving" ? "● 磁盘备份中" : backupStatus === "permission-required" ? "● 磁盘待授权" : backupStatus === "error" ? "● 磁盘备份失败" : backupStatus === "unsupported" ? "磁盘备份不支持" : "磁盘未配置"}
          </span>
          <span className={`sync-status ${settings.liveSync && syncSupported ? "active" : ""}`} title={syncSupported ? "多个 SwiftResume 页面实时同步" : "当前浏览器不支持多页面同步"}>
            <span />{settings.liveSync && syncSupported ? "多页同步" : "同步关闭"}
          </span>
          <button type="button" className="secondary-button" onClick={() => downloadResume(resume)}>备份当前简历</button>
          <button type="button" className="secondary-button" onClick={() => importRef.current?.click()}>导入 JSON 备份</button>
            </div>
          </details>
          <button type="button" className="secondary-button" onClick={() => setSettingsOpen(true)}>设置</button>
          <input ref={importRef} hidden type="file" accept=".json" onChange={(event) => void importFile(event.target.files?.[0])} />
          <button type="button" className="secondary-button standalone-preview-button" disabled={!activeResumeId} onClick={openStandalonePreview}>↗ 独立预览</button>
          <button type="button" className="primary-button export-button" disabled={exporting} onClick={() => void exportPdf()}>{exporting ? "正在生成…" : "导出 PDF"}</button>
        </div>
      </header>
      <nav className="workspace-controls" aria-label="工作区布局">
        <button type="button" className="secondary-button" aria-expanded={modulesOpen} onClick={() => setModulesOpen(!modulesOpen)}>{modulesOpen ? "收起模块" : "简历模块"}</button>
        <div className="workspace-view-options">
          <button type="button" className={`secondary-button ${!previewVisible ? "active" : ""}`} aria-pressed={!previewVisible} onClick={() => { setMobilePreview(false); setSettings((current) => ({ ...current, previewOpen: false })); }}>专注编辑</button>
          <button type="button" className={`secondary-button ${previewVisible ? "active" : ""}`} aria-pressed={previewVisible} onClick={() => { setMobilePreview(true); setSettings((current) => ({ ...current, previewOpen: true })); }}>{compactWorkspace ? "查看预览" : "编辑＋预览"}</button>
        </div>
      </nav>
      <div className={`workspace ${previewVisible ? "" : "preview-hidden"} ${modulesOpen ? "modules-open" : "modules-hidden"} ${compactWorkspace && previewVisible ? "mobile-preview" : ""}`}>
        {modulesOpen && <Sidebar resume={resume} selectedId={selectedId} onSelect={locateResumeBlock} onSectionsChange={setSections} onDeleteSection={removeSection} />}
        <ResumeEditorCanvas
          key={activeResumeId}
          resume={resume}
          selectedId={selectedId}
          editingId={editingId}
          onEdit={editResumeBlock}
          onCloseEditor={closeInlineEditor}
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
              <label className="template-picker">
                <span>模板</span>
                <select aria-label="简历模板" value={resume.theme.templateId} onChange={(event) => dispatch({ type: "update-theme", value: { templateId: event.target.value as ResumeDocument["theme"]["templateId"] } })}>
                  {RESUME_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
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
      {newResumeOpen && <NewResumeDialog onSelect={createResume} onClose={() => setNewResumeOpen(false)} />}
      {backupPromptOpen && backupStatus !== "unsupported" && <BackupSetupPrompt
        status={backupStatus}
        directoryName={backupDirectory?.name ?? ""}
        onChooseDirectory={() => void selectBackupDirectory()}
        onAuthorizeDirectory={() => void authorizeBackupDirectory()}
        onLater={() => setBackupPromptOpen(false)}
      />}
    </div>
  );
}
