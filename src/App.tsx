import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { EditorPanel } from "./components/EditorPanel";
import { ResumePreview } from "./components/ResumePreview";
import { Sidebar } from "./components/Sidebar";
import { createDefaultResume, resumeReducer, type Density, type ResumeSection } from "./model/resume";
import { downloadResume, loadResume, parseResumeFile, saveResume } from "./storage/resumeStorage";

const densityLabels: Record<Density, string> = { comfortable: "宽松", standard: "标准", compact: "紧凑" };

export function App() {
  const [resume, dispatch] = useReducer(resumeReducer, undefined, createDefaultResume);
  const [selectedId, setSelectedId] = useState("profile");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [overflow, setOverflow] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadResume().then((stored) => {
      if (active && stored) dispatch({ type: "replace", value: stored });
    }).catch(() => setSaveState("error")).finally(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveResume(resume).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, resume]);

  useEffect(() => {
    if (selectedId !== "profile" && !resume.sections.some((section) => section.id === selectedId)) setSelectedId("profile");
  }, [resume.sections, selectedId]);

  const setSections = (sections: ResumeSection[]) => dispatch({ type: "set-sections", value: sections });
  const updateSection = (section: ResumeSection) => setSections(resume.sections.map((item) => item.id === section.id ? section : item));
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      dispatch({ type: "replace", value: await parseResumeFile(file) });
      setSelectedId("profile");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "导入失败");
    }
  };
  const handleOverflow = useCallback((value: boolean) => setOverflow(value), []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SwiftResume</strong><small>模块化简历工作台</small></div></div>
        <input className="document-title" aria-label="简历文件名" value={resume.title} onChange={(event) => dispatch({ type: "update-title", value: event.target.value })} />
        <div className="topbar-actions">
          <span className={`save-status ${saveState}`}>{saveState === "saved" ? "● 已自动保存" : saveState === "saving" ? "● 保存中" : "● 保存失败"}</span>
          <button type="button" className="secondary-button" onClick={() => downloadResume(resume)}>备份 JSON</button>
          <button type="button" className="secondary-button" onClick={() => importRef.current?.click()}>导入</button>
          <input ref={importRef} hidden type="file" accept=".json" onChange={(event) => void importFile(event.target.files?.[0])} />
          <button type="button" className="primary-button export-button" onClick={() => window.print()}>导出 PDF</button>
        </div>
      </header>
      <div className="workspace">
        <Sidebar resume={resume} selectedId={selectedId} onSelect={setSelectedId} onSectionsChange={setSections} />
        <EditorPanel resume={resume} selectedId={selectedId} onProfileChange={(value) => dispatch({ type: "update-profile", value })} onSectionChange={updateSection} onDeleteSection={(sectionId) => setSections(resume.sections.filter((section) => section.id !== sectionId))} />
        <section className="preview-panel">
          <div className="preview-toolbar">
            <div><strong>A4 实时预览</strong><span className={overflow ? "overflow-warning" : "page-ok"}>{overflow ? "内容已超出一页" : "一页内"}</span></div>
            <div className="density-switch" aria-label="排版密度">{(Object.keys(densityLabels) as Density[]).map((density) => (
              <button type="button" key={density} className={resume.theme.density === density ? "active" : ""} onClick={() => dispatch({ type: "update-theme", value: { density } })}>{densityLabels[density]}</button>
            ))}</div>
            <label className="accent-picker" title="强调色"><span>配色</span><input type="color" value={resume.theme.accent} onChange={(event) => dispatch({ type: "update-theme", value: { accent: event.target.value } })} /></label>
          </div>
          <ResumePreview resume={resume} onOverflowChange={handleOverflow} />
        </section>
      </div>
    </div>
  );
}
