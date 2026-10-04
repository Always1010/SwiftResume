import { AppIcon } from "./AppIcon";
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
  onSelect: (id: string, enabled?: boolean) => void;
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
          <h2>简历模块</h2>
        </div>
        <span className="module-count">{resume.sections.length}</span>
      </div>

      <button
        type="button"
        className={`module-row profile-row ${selectedId === "profile" ? "selected" : ""}`}
        aria-pressed={selectedId === "profile"}
        onClick={() => onSelect("profile")}
      >
        <AppIcon name="user" />
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
          >
            <button type="button" className="module-select" aria-pressed={selectedId === section.id} onClick={() => onSelect(section.id, section.enabled)}>
              <span className="drag-handle" title="拖动排序" aria-hidden="true">⋮⋮</span>
              <span className="module-copy">
                <strong>{section.title || sectionLabels[section.type]}</strong>
                {!section.enabled && <small>已隐藏</small>}
              </span>
            </button>
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
                <AppIcon name={section.enabled ? "eye" : "eyeOff"} />
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
                  onSelect(copy.id, copy.enabled);
                }}
              >
                <AppIcon name="copy" />
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
                <AppIcon name="trash" />
              </button>
            </div>
          </div>
        ))}
        <div className="add-module">
          <button type="button" className="secondary-button" onClick={() => setAddPurpose("work")}><AppIcon name="plus" />添加模块</button>
        </div>
        {addPurpose && <AddModuleDialog initialPurpose={addPurpose} onClose={() => setAddPurpose(null)} onAdd={(section) => { onAdd(section); setAddPurpose(null); }} />}
      </div>
    </aside>
  );
}
