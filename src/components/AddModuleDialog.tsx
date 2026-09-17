import { useMemo, useState } from "react";
import { createQuickSection, type ResumeSection, type SectionPurpose } from "../model/resume";
import { MODULE_PRESETS } from "../model/contentPresets";
import { plainText } from "../model/writingGuide";
import { Modal } from "./Modal";

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
  const [example, setExample] = useState(false);
  const [title, setTitle] = useState("");
  const sample = useMemo(() => createQuickSection(purpose, "example"), [purpose]);
  return <Modal titleId="add-module-title" className="flow-dialog add-module-dialog" onClose={onClose}>
    <header className="workspace-dialog-header"><div><h2 id="add-module-title">添加适合这段经历的模块</h2><p>选择结构，查看示例，再开始填写。</p></div><button type="button" className="secondary-button" onClick={onClose}>关闭</button></header>
    <div className="module-picker-layout"><div className="module-picker-options" role="group" aria-label="模块类型">{MODULE_CHOICES.map(([id, name, description]) => <button type="button" key={id} aria-pressed={purpose === id} className={purpose === id ? "selected" : ""} onClick={() => setPurpose(id)}><strong>{name}</strong><small>{description}</small></button>)}</div>
      <section className="module-sample"><span className="eyebrow">填写示例 · 虚构内容</span><h3>{sample.title}</h3>{sample.type === "education" ? <><strong>{sample.items[0].school}</strong><p>{sample.items[0].major} · {sample.items[0].degree}</p><p>{sample.items[0].date}</p><p>{sample.items[0].detail}</p></> : <><strong>{sample.entries[0].title}</strong><p>{[sample.entries[0].subtitle, sample.entries[0].date].filter(Boolean).join(" · ")}</p><p className="preserve-lines">{plainText(sample.entries[0].body)}</p></>}
      <div className="module-skeleton"><strong>默认带入的填写骨架</strong><p className="preserve-lines">{purpose === "education" ? "学校 / 专业 / 学历 / 起止时间\n选填课程与荣誉" : MODULE_PRESETS[purpose].skeleton.join("\n") || "空白正文，自由填写"}</p></div></section>
    </div>
    {purpose === "custom" && <label className="flow-field">模块名称<input value={title} placeholder="例如：开源经历" onChange={(event) => setTitle(event.target.value)} /></label>}
    <label className="restore-choice"><input type="checkbox" checked={example} onChange={(event) => setExample(event.target.checked)} />带入上面的示例内容，边参考边替换</label>
    <footer className="scene-footer"><span className="flow-muted">{example ? "示例会写入简历，请替换为真实经历。" : "添加后直接打开编辑，按提示填写即可。"}</span><button type="button" className="primary-button" disabled={purpose === "custom" && !title.trim()} onClick={() => { const section = createQuickSection(purpose, example ? "example" : "skeleton"); if (purpose === "custom") section.title = title.trim(); onAdd(section); }}>添加并编辑</button></footer>
  </Modal>;
}
