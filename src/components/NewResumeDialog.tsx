import { useRef, useState } from "react";
import { type ResumeCreationTemplate } from "../model/resume";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";
import { scenarioPreviewPages } from "../templates/staticPreviews";
import "../staticPreviews.css";

const OPTIONS = [
  { id: "graduate", title: "应届生 / 实习", description: "教育、项目与实习经历" },
  { id: "experienced", title: "已有工作经验", description: "工作经历与代表项目" },
  { id: "blank", title: "空白简历", description: "自己添加模块和内容" },
] as const;

export function NewResumeDialog({ onSelect, onClose }: {
  onSelect: (template: ResumeCreationTemplate, withExamples?: boolean) => void | Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<typeof OPTIONS[number]["id"]>("graduate");
  const [withExamples, setWithExamples] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const close = () => { if (!busyRef.current) onClose(); };
  const create = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await onSelect(selected, selected === "blank" ? false : withExamples); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "创建失败，请重试。"); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <Modal titleId="new-resume-title" className="flow-dialog scene-dialog" onClose={close}>
    <header className="workspace-dialog-header">
      <div><h2 id="new-resume-title">新建简历</h2><p>选择一个起点</p></div>
      <CloseButton onClick={close} disabled={busy} label="关闭新建简历" />
    </header>
    <div className="scene-options" role="group" aria-label="选择简历起点">
      {OPTIONS.map((option) => <button key={option.id} type="button" disabled={busy} className={`scene-option ${selected === option.id ? "selected" : ""}`} aria-pressed={selected === option.id} onClick={() => setSelected(option.id)}>
        <div className={`scene-thumbnail ${option.id === "blank" ? "scene-blank" : ""}`} aria-hidden="true">{option.id === "blank" ? <span className="blank-resume-sheet" /> : <img src={scenarioPreviewPages(option.id)[0].src} alt="" loading="lazy" decoding="async" />}</div>
        <span className="scene-label"><strong>{option.title}</strong><span>{option.description}</span></span>
      </button>)}
    </div>
    <footer className="scene-footer">
      {selected !== "blank" ? <label className="restore-choice"><input type="checkbox" disabled={busy} checked={withExamples} onChange={(event) => setWithExamples(event.target.checked)} />带入示例内容</label> : <span className="flow-muted">空白内容，随时添加模块</span>}
      <button type="button" className="primary-button" disabled={busy} onClick={() => void create()}>{busy ? "正在创建…" : "创建并编辑"}</button>
    </footer>
    {error && <p role="alert" className="flow-error">{error}</p>}
  </Modal>;
}
