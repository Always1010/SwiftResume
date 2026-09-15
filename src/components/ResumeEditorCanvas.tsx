import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { getDensityLayout, type ResumeDocument, type ResumeProfile, type ResumeSection } from "../model/resume";
import { EditorPanel } from "./EditorPanel";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";

interface ResumeEditorCanvasProps {
  resume: ResumeDocument;
  selectedId: string;
  onSelect: (id: string) => void;
  onProfileChange: (profile: ResumeProfile) => void;
  onSectionChange: (section: ResumeSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onCommit: () => void;
}

export function ResumeEditorCanvas({
  resume,
  selectedId,
  onSelect,
  onProfileChange,
  onSectionChange,
  onDeleteSection,
  onCommit,
}: ResumeEditorCanvasProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId || editingId === "profile") return;
    const editingSection = resume.sections.find((section) => section.id === editingId);
    if (editingSection?.enabled) return;
    if (editingSection) onCommit();
    setEditingId(null);
  }, [editingId, onCommit, resume.sections]);

  const closeEditor = () => {
    if (!editingId) return;
    onCommit();
    setEditingId(null);
  };

  const editBlock = (id: string) => {
    if (editingId === id) return;
    if (editingId) onCommit();
    onSelect(id);
    setEditingId(id);
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
    fontSize: `${density.fontSizePx}px`,
  } as CSSProperties;

  const renderEditor = (id: string) => (
    <div className="inline-editor-shell" onClick={(event) => event.stopPropagation()}>
      <div className="inline-editor-toolbar">
        <span>正在编辑 · 修改会自动保存</span>
        <button type="button" className="primary-button" onClick={closeEditor}>完成编辑</button>
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
    if (event.target === event.currentTarget) closeEditor();
  };

  return (
    <main className="resume-editor-scroller panel" aria-label="整页简历编辑区" onClick={handleBoundaryClick}>
      <div className="resume-editor-hint">点击简历中的文字或模块即可就地编辑；侧栏用于快速定位。</div>
      <div className="resume-editor-canvas resume-page" style={canvasStyle}>
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
