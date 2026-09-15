import { useState } from "react";
import {
  createSection,
  duplicateSection,
  moveSection,
  reorderSection,
  type CustomEditorMode,
  type ResumeDocument,
  type ResumeSection,
  type SectionType,
} from "../model/resume";

const sectionLabels: Record<SectionType, string> = {
  education: "教育经历",
  skills: "专业技能",
  projects: "项目经历",
  experience: "工作经历",
  awards: "荣誉奖项",
  custom: "自定义板块",
};

const customModeLabels: Record<CustomEditorMode, string> = {
  builder: "结构搭建",
  document: "自由文档",
  richtext: "富文本",
};

const customModeDescriptions: Record<CustomEditorMode, string> = {
  builder: "逐块配置，精确控制布局",
  document: "像文档一样直接编辑（推荐）",
  richtext: "自由输入或粘贴长文本",
};

interface SidebarProps {
  resume: ResumeDocument;
  selectedId: string;
  onSelect: (id: string) => void;
  onSectionsChange: (sections: ResumeSection[]) => void;
}

export function Sidebar({ resume, selectedId, onSelect, onSectionsChange }: SidebarProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newCustomMode, setNewCustomMode] = useState<CustomEditorMode>("document");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const addSection = () => {
    const title = newTitle.trim();
    if (!title) return;
    const section = createSection("custom", newCustomMode);
    section.title = title;
    onSectionsChange([...resume.sections, section]);
    onSelect(section.id);
    setNewTitle("");
  };

  return (
    <aside className="sidebar panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">内容结构</span>
          <h2>简历模块</h2>
        </div>
        <span className="module-count">{resume.sections.length}</span>
      </div>

      <button
        type="button"
        className={`module-row profile-row ${selectedId === "profile" ? "selected" : ""}`}
        onClick={() => onSelect("profile")}
      >
        <span className="drag-handle muted">◆</span>
        <span>
          <strong>个人信息</strong>
          <small>{resume.profile.name || "待填写姓名"}</small>
        </span>
        <span className="module-type">固定</span>
      </button>

      <div className="module-list" aria-label="简历模块列表">
        {resume.sections.map((section, index) => (
          <div
            key={section.id}
            className={`module-row ${selectedId === section.id ? "selected" : ""} ${
              !section.enabled ? "disabled" : ""
            }`}
            draggable
            onDragStart={() => setDraggedId(section.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId) onSectionsChange(reorderSection(resume.sections, draggedId, section.id));
            }}
            onClick={() => onSelect(section.id)}
          >
            <span className="drag-handle" title="拖动排序">⋮⋮</span>
            <span className="module-copy">
              <strong>{section.title || sectionLabels[section.type]}</strong>
              <small>{section.type === "custom" ? customModeLabels[section.editorMode] : sectionLabels[section.type]}{!section.enabled && " · 已隐藏"}</small>
            </span>
            <div className="module-actions">
              <button
                type="button"
                className="icon-button module-move-button"
                title="上移模块"
                aria-label={`上移${section.title || sectionLabels[section.type]}`}
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  onSectionsChange(moveSection(resume.sections, section.id, -1));
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-button module-move-button"
                title="下移模块"
                aria-label={`下移${section.title || sectionLabels[section.type]}`}
                disabled={index === resume.sections.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onSectionsChange(moveSection(resume.sections, section.id, 1));
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-button"
                title={section.enabled ? "隐藏模块" : "显示模块"}
                onClick={(event) => {
                  event.stopPropagation();
                  onSectionsChange(
                    resume.sections.map((item) =>
                      item.id === section.id ? { ...item, enabled: !item.enabled } : item,
                    ),
                  );
                }}
              >
                {section.enabled ? "◉" : "○"}
              </button>
              <button
                type="button"
                className="icon-button"
                title="复制模块"
                onClick={(event) => {
                  event.stopPropagation();
                  const copy = duplicateSection(section);
                  const next = [...resume.sections];
                  next.splice(index + 1, 0, copy);
                  onSectionsChange(next);
                  onSelect(copy.id);
                }}
              >
                ⧉
              </button>
            </div>
          </div>
        ))}
        <div className="add-module">
          <label className="add-module-label" htmlFor="new-module-title">添加模块</label>
          <input
            id="new-module-title"
            value={newTitle}
            placeholder="输入模块名称，如：开源经历"
            aria-label="新模块名称"
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addSection();
            }}
          />
          <div className="custom-mode-options" aria-label="选择自定义模块编辑方式">
            {(Object.keys(customModeLabels) as CustomEditorMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={newCustomMode === mode ? "selected" : ""}
                aria-pressed={newCustomMode === mode}
                onClick={() => setNewCustomMode(mode)}
              >
                <strong>{customModeLabels[mode]}{mode === "document" && <span>推荐</span>}</strong>
                <small>{customModeDescriptions[mode]}</small>
              </button>
            ))}
          </div>
          <button type="button" className="primary-button" disabled={!newTitle.trim()} onClick={addSection}>
            ＋ 添加模块
          </button>
        </div>
      </div>
    </aside>
  );
}
