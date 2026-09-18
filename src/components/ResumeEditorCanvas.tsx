import { useEffect, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { getDensityLayout, type ResumeDocument, type ResumeProfile, type ResumeSection } from "../model/resume";
import { EditorPanel } from "./EditorPanel";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";

interface ResumeEditorCanvasProps {
  resume: ResumeDocument;
  selectedId: string;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCloseEditor: () => void;
  onProfileChange: (profile: ResumeProfile) => void;
  onSectionChange: (section: ResumeSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onClearContent?: () => void;
}

export function ResumeEditorCanvas({
  resume,
  selectedId,
  editingId,
  onEdit,
  onCloseEditor,
  onProfileChange,
  onSectionChange,
  onDeleteSection,
  onClearContent,
}: ResumeEditorCanvasProps) {
  useEffect(() => {
    if (!editingId || editingId === "profile") return;
    const editingSection = resume.sections.find((section) => section.id === editingId);
    if (editingSection?.enabled) return;
    onCloseEditor();
  }, [editingId, onCloseEditor, resume.sections]);

  const editBlock = (id: string) => {
    if (editingId === id) return;
    onEdit(id);
  };

  const handleViewKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    editBlock(id);
  };

  const density = getDensityLayout(resume.theme.density);
  const canvasStyle = {
    "--resume-accent": resume.theme.accent,
    "--section-space": `${density.sectionSpacePx}px`,
    "--entry-space": `${density.entrySpacePx}px`,
    "--body-line": density.bodyLine,
    "--resume-font-size": `${density.fontSizePx}px`,
    fontSize: `${density.fontSizePx}px`,
  } as CSSProperties;

  const renderEditor = (id: string) => (
    <div className="inline-editor-shell" onClick={(event) => event.stopPropagation()}>
      <div className="inline-editor-toolbar">
        <span>正在编辑 · 修改会自动保存</span>
        <button type="button" className="primary-button" onClick={onCloseEditor}>完成编辑</button>
      </div>
      <EditorPanel
        resume={resume}
        selectedId={id}
        onProfileChange={onProfileChange}
        onSectionChange={onSectionChange}
        onDeleteSection={onDeleteSection}
        embedded
      />
    </div>
  );

  const handleBoundaryClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) onCloseEditor();
  };

  return (
    <main className="resume-editor-scroller panel" aria-label="整页简历编辑区" onClick={handleBoundaryClick}>
      <div className="resume-editor-hint">点击文字或模块编辑内容；最终排版请查看右侧或独立预览。</div>
      {resume.profile.name.includes("【示例】") && <div className="sample-notice"><span>当前是虚构示例，请逐项替换为自己的真实经历。</span>{onClearContent && <button type="button" className="text-button" onClick={onClearContent}>清空示例，保留结构</button>}</div>}
      <div className="resume-editor-canvas resume-page resume-template-classic" style={canvasStyle}>
        <section
          id="resume-block-profile"
          data-resume-block="profile"
          className={`resume-editable-block profile-block ${selectedId === "profile" ? "located" : ""} ${editingId === "profile" ? "editing" : ""}`}
          role={editingId === "profile" ? undefined : "button"}
          tabIndex={editingId === "profile" ? undefined : 0}
          onClick={() => editBlock("profile")}
          onKeyDown={(event) => handleViewKeyDown(event, "profile")}
        >
          {editingId === "profile" ? renderEditor("profile") : <ResumeProfileView resume={resume} />}
        </section>

        {resume.sections.filter((section) => section.enabled).map((section) => (
          <section
            id={`resume-block-${section.id}`}
            data-resume-block={section.id}
            key={section.id}
            className={`resume-editable-block section-block ${selectedId === section.id ? "located" : ""} ${editingId === section.id ? "editing" : ""}`}
            role={editingId === section.id ? undefined : "button"}
            tabIndex={editingId === section.id ? undefined : 0}
            onClick={() => editBlock(section.id)}
            onKeyDown={(event) => handleViewKeyDown(event, section.id)}
          >
            {editingId === section.id ? renderEditor(section.id) : <ResumeSectionView section={section} />}
          </section>
        ))}
      </div>
    </main>
  );
}
