import { useMemo, useState } from "react";
import { createQuickSection, type ResumeSection, type SectionPurpose } from "../model/resume";
import { plainText } from "../model/contentLabels";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";

export const MODULE_CHOICES = [
  ["education", "教育经历", "学校、专业、学历、时间、课程与荣誉"],
  ["work", "工作经历", "公司、岗位、时间、职责与成果"],
  ["project", "项目经历", "项目、角色、背景、行动与结果"],
  ["skills", "专业技能", "按类别组织技能，说明实际应用场景"],
  ["summary", "个人简介", "用一段文字概括经验、能力与求职方向"],
  ["custom", "自定义模块", "自由组织内容，例如荣誉、证书或开源经历"],
] as const;

export function AddModuleDialog({ initialPurpose, onAdd, onClose }: {
  initialPurpose: SectionPurpose | "education";
  onAdd: (section: ResumeSection) => void;
  onClose: () => void;
}) {
  const [purpose, setPurpose] = useState(initialPurpose);
  const [title, setTitle] = useState("自定义模块");
  const sample = useMemo(() => createQuickSection(purpose, "example"), [purpose]);
  return <Modal titleId="add-module-title" className="flow-dialog add-module-dialog" onClose={onClose}>
    <header className="workspace-dialog-header"><div><h2 id="add-module-title">添加模块</h2></div><CloseButton onClick={onClose} label="关闭添加模块" /></header>
    <div className="module-picker-layout"><div className="module-picker-options" role="group" aria-label="模块类型">{MODULE_CHOICES.map(([id, name, description]) => <button type="button" key={id} aria-pressed={purpose === id} className={purpose === id ? "selected" : ""} onClick={() => setPurpose(id)}><strong>{name}</strong><small>{description}</small></button>)}</div>
      <section className="module-sample"><span className="eyebrow">示例内容</span><h3>{sample.title}</h3>{sample.type === "education" ? <><strong>{sample.items[0].school}</strong><p>{sample.items[0].major} · {sample.items[0].degree}</p><p>{sample.items[0].date}</p><p>{sample.items[0].detail}</p></> : <><strong>{sample.entries[0].title}</strong><p>{[sample.entries[0].subtitle, sample.entries[0].date].filter(Boolean).join(" · ")}</p><p className="preserve-lines">{plainText(sample.entries[0].body)}</p></>}
      </section>
    </div>
    {purpose === "custom" && <label className="flow-field">模块名称<input value={title} placeholder="例如：开源经历" onChange={(event) => setTitle(event.target.value)} /></label>}
    <footer className="scene-footer"><span className="flow-muted">添加后可直接修改示例内容</span><button type="button" className="primary-button" disabled={purpose === "custom" && !title.trim()} onClick={() => { const section = createQuickSection(purpose, "example"); if (purpose === "custom") section.title = title.trim(); onAdd(section); }}>添加并编辑</button></footer>
  </Modal>;
}
