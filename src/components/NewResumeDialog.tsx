import type { ResumeCreationTemplate } from "../model/resume";

interface NewResumeDialogProps {
  onSelect: (template: ResumeCreationTemplate) => void;
  onClose: () => void;
}

export function NewResumeDialog({ onSelect, onClose }: NewResumeDialogProps) {
  return (
    <div className="new-resume-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="new-resume-dialog" role="dialog" aria-modal="true" aria-labelledby="new-resume-title">
        <header>
          <div>
            <span className="eyebrow">新建简历</span>
            <h2 id="new-resume-title">选择内容模板</h2>
            <p>模板只决定初始内容，创建后所有模块都可以自由编辑。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭新建简历窗口">×</button>
        </header>
        <div className="new-resume-options">
          <button type="button" className="new-resume-option recommended" onClick={() => onSelect("default")}>
            <span className="new-resume-option-icon" aria-hidden="true">✦</span>
            <span>
              <strong>默认模板</strong>
              <small>推荐</small>
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
    </div>
  );
}
