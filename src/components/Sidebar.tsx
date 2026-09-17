import { useState } from "react";
import {
  duplicateSection,
  reorderSection,
  type ResumeDocument,
  type ResumeSection,
  type SectionType,
  type SectionPurpose,
} from "../model/resume";

import { AddModuleDialog } from "./AddModuleDialog";

const sectionLabels: Record<SectionType, string> = {
  education: "教育经历",
  content: "通用内容",
};

interface SidebarProps {
  resume: ResumeDocument;
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (section: ResumeSection) => void;
  onSectionsChange: (sections: ResumeSection[]) => void;
  onDeleteSection: (sectionId: string) => void;
}

export function Sidebar({ resume, selectedId, onSelect, onAdd, onSectionsChange, onDeleteSection }: SidebarProps) {
  const [addPurpose, setAddPurpose] = useState<SectionPurpose | "education" | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
              <small>{section.type === "content" ? ({ work: "职责与成果", project: "背景、行动与结果", skills: "技能分组", summary: "一段简介", custom: "自由内容" }[section.purpose ?? "custom"]) : sectionLabels[section.type]}{!section.enabled && " · 已隐藏"}</small>
            </span>
            <div className="module-actions">
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
              <button
                type="button"
                className="icon-button danger-text"
                title="删除模块"
                aria-label={`删除${section.title || sectionLabels[section.type]}模块`}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteSection(section.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <div className="add-module">
          <span className="add-module-label">添加模块</span>
          <div className="quick-modules">{([ ["education", "教育"], ["work", "工作"], ["project", "项目"], ["skills", "技能"], ["summary", "个人简介"], ["custom", "自定义"] ] as const).map(([purpose, label]) => <button key={purpose} type="button" className="secondary-button" onClick={() => setAddPurpose(purpose)}>＋ {label}</button>)}</div>
          <p className="add-module-hint">先查看填写示例，再添加对应结构。</p>
        </div>
        {addPurpose && <AddModuleDialog initialPurpose={addPurpose} onClose={() => setAddPurpose(null)} onAdd={(section) => { onAdd(section); setAddPurpose(null); }} />}
      </div>
    </aside>
  );
}
