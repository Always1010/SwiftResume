import type { ResumeCreationTemplate } from "../model/resume";
import { Modal } from "./Modal";

interface NewResumeDialogProps {
  onSelect: (template: ResumeCreationTemplate) => void;
  onClose: () => void;
}

export function NewResumeDialog({ onSelect, onClose }: NewResumeDialogProps) {
  return (
    <Modal titleId="new-resume-title" className="flow-dialog" onClose={onClose}>
      <section className="new-resume-dialog">
        <header>
          <div>
            <span className="eyebrow">新建简历</span>
            <h2 id="new-resume-title">从适合你的起点开始</h2>
            <p>先准备好常用模块，填写你自己的内容；写作示例不会自动进入简历。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭新建简历窗口">×</button>
        </header>
        <div className="new-resume-options">
          {([
            ["graduate", "应届生 / 实习", "从教育、项目与技能开始，也可以补充实习经历。"],
            ["experienced", "已有工作经验", "突出工作成果与项目经验，再补充技能和教育。"],
            ["career-change", "转行求职", "先说明求职方向与可迁移技能，再用项目和经历支持。"],
          ] as const).map(([id, title, description]) => <button key={id} type="button" className="new-resume-option" onClick={() => onSelect(id)}><strong>{title}</strong><p>{description}</p></button>)}
          <button type="button" className="new-resume-option" onClick={() => onSelect("default")}>
            <span className="new-resume-option-icon" aria-hidden="true">✦</span>
            <span>
              <strong>搞笑示例演示</strong>
            </span>
            <p>包含完整的搞笑反差示例、卡通头像和六个常用模块，适合边参考边替换。</p>
          </button>
          <button type="button" className="new-resume-option" onClick={() => onSelect("blank")}>
            <span className="new-resume-option-icon blank" aria-hidden="true">□</span>
            <span><strong>空白模板</strong></span>
            <p>只创建一份空简历，不预置个人信息或模块，适合从零开始。</p>
          </button>
        </div>
      </section>
    </Modal>
  );
}
