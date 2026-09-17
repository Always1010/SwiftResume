import { useMemo, useState } from "react";
import { createResumeFromTemplate, type ResumeCreationTemplate } from "../model/resume";
import { SCENARIOS } from "../model/contentPresets";
import { Modal } from "./Modal";
import { ResumePreview } from "./ResumePreview";

export function NewResumeDialog({ onSelect, onClose }: {
  onSelect: (template: ResumeCreationTemplate, withExamples?: boolean) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<typeof SCENARIOS[number]["id"]>("graduate");
  const [withExamples, setWithExamples] = useState(true);
  const documents = useMemo(() => SCENARIOS.map((scene) => createResumeFromTemplate(scene.id)), []);
  return <Modal titleId="new-resume-title" className="flow-dialog scene-dialog" onClose={onClose}>
    <header className="workspace-dialog-header">
      <div><span className="eyebrow">内容示例</span><h2 id="new-resume-title">从一份完整简历开始</h2><p>先选适合自己的写法，创建后逐项替换。所有人物、经历与成果均为虚构示例。</p></div>
      <button type="button" className="secondary-button" onClick={onClose} aria-label="关闭新建简历窗口">关闭</button>
    </header>
    <div className="scene-options" role="group" aria-label="选择内容示例">
      {SCENARIOS.map((scene, index) => <button key={scene.id} type="button" className={`scene-option ${selected === scene.id ? "selected" : ""}`} aria-pressed={selected === scene.id} onClick={() => setSelected(scene.id)}>
        <div className="scene-thumbnail" aria-hidden="true"><ResumePreview resume={documents[index]} zoom="fit" /></div>
        <span className="scene-label"><strong>{scene.title}</strong><small>{scene.role} · 完整示例</small><span>{scene.description}</span></span>
      </button>)}
    </div>
    <details className="scene-full-preview"><summary>放大查看所选示例</summary><ResumePreview resume={documents[SCENARIOS.findIndex((scene) => scene.id === selected)]} zoom="fit" /></details>
    <label className="restore-choice"><input type="checkbox" checked={withExamples} onChange={(event) => setWithExamples(event.target.checked)} />带入示例内容，边参考边替换</label>
    <p className="flow-muted">取消勾选会清空示例，仅保留模块结构与排版。排版样式也可以在创建后单独更换。</p>
    <footer className="scene-footer"><button type="button" className="secondary-button" onClick={() => onSelect("blank", false)}>从空白开始</button><button type="button" className="primary-button" onClick={() => onSelect(selected, withExamples)}>创建{SCENARIOS.find((scene) => scene.id === selected)?.title}简历</button></footer>
    <details className="scene-demo"><summary>其他演示</summary><button type="button" className="text-button" onClick={() => onSelect("default")}>打开搞笑示例演示</button></details>
  </Modal>;
}
