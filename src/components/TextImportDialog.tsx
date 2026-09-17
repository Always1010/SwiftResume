import { useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { parseResumeText } from "../model/textImport";
import { plainText } from "../model/writingGuide";
import { Modal } from "./Modal";
export function TextImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (resume: ResumeDocument) => Promise<void> }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <Modal titleId="text-import-title" className="flow-dialog" onClose={() => !busy && onClose()}>
    <h2 id="text-import-title">粘贴已有简历</h2><p>按常见模块标题整理文本。内容只在本机处理；未识别的段落会保留，导入后仍可编辑。</p>
    {!draft ? <label className="flow-field">简历文本<textarea rows={16} value={text} maxLength={100_000} onChange={(e) => setText(e.target.value)} placeholder="粘贴从 Word、PDF 或其他地方复制的文字…" /></label> : <>
      <label className="flow-field">新简历名称<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <p>已识别 {draft.sections.length} 个模块。取消勾选的模块不会导入；个人信息也请核对。</p>
      <div className="flow-columns">{([ ["name", "姓名"], ["phone", "手机"], ["email", "邮箱"] ] as const).map(([key, label]) => <label className="flow-field" key={key}>{label}<input value={draft.profile[key]} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, [key]: e.target.value } })} /></label>)}</div>
      <ul className="flow-list">{draft.sections.map((section) => <li key={section.id}><label className="restore-choice"><input type="checkbox" checked={section.enabled} onChange={(e) => setDraft({ ...draft, sections: draft.sections.map((s) => s.id === section.id ? { ...s, enabled: e.target.checked } : s) })} />导入此模块</label><label className="flow-field">模块名称<input value={section.title} onChange={(e) => setDraft({ ...draft, sections: draft.sections.map((s) => s.id === section.id ? { ...s, title: e.target.value } : s) })} /></label><pre className="import-text">{section.type === "content" ? section.entries.map((e) => plainText(e.body)).join("\n") : ""}</pre></li>)}</ul>
    </>}
    {error && <p role="alert" className="flow-error">{error}</p>}
    <div className="flow-actions"><button className="secondary-button" disabled={busy} onClick={draft ? () => { setDraft(null); setError(""); } : onClose}>{draft ? "返回文本" : "取消"}</button><button className="primary-button" disabled={busy || (draft ? !draft.sections.some((s) => s.enabled) : !text.trim())} onClick={() => {
      setError("");
      if (!draft) { try { setDraft(parseResumeText(text)); } catch (e) { setError((e as Error).message); } return; }
      setBusy(true); void onImport({ ...draft, sections: draft.sections.filter((s) => s.enabled) }).catch((e) => setError(e instanceof Error ? e.message : "导入失败")).finally(() => setBusy(false));
    }}>{busy ? "正在创建…" : draft ? "确认并创建新简历" : "识别并预览"}</button></div>
  </Modal>;
}
