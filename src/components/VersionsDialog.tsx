import { useEffect, useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { compareVersions, jobVersion } from "../model/resumeVersions";
import { loadResumeById, type ResumeLibrary } from "../storage/resumeStorage";
import { Modal } from "./Modal";
export function VersionsDialog({ resume, library, onClose, onUpdate, onCreate, onSyncContacts }: { resume: ResumeDocument; library: ResumeLibrary; onClose: () => void; onUpdate: (target: NonNullable<ResumeDocument["target"]>) => void; onCreate: (resume: ResumeDocument) => Promise<void>; onSyncContacts: (ids: string[]) => Promise<void> }) {
  const [target, setTarget] = useState(resume.target ?? { company: "", role: "", notes: "" });
  const [compareId, setCompareId] = useState(resume.lastExport ? "last-export" : "");
  const [other, setOther] = useState<ResumeDocument | null>(resume.lastExport?.snapshot ?? null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setOther(null);
    if (compareId === "last-export") setOther(resume.lastExport?.snapshot ?? null);
    else if (compareId) void loadResumeById(compareId).then((value) => { if (active) { setOther(value); if (!value) setMessage("无法读取所选版本"); } }).catch(() => active && setMessage("读取版本失败"));
    return () => { active = false; };
  }, [compareId, resume.lastExport]);
  const run = async (fn: () => Promise<void>, success: string) => { setBusy(true); setMessage(""); try { await fn(); setMessage(success); } catch (e) { setMessage(e instanceof Error ? e.message : "操作失败，请重试"); } finally { setBusy(false); } };
  const differences = other ? compareVersions(other, resume) : [];
  return <Modal titleId="versions-title" className="flow-dialog" onClose={onClose}>
    <h2 id="versions-title">岗位版本与对比</h2><p>为不同公司保留独立版本，针对岗位修改经历。</p>
    <div className="flow-columns">{([ ["company", "目标公司"], ["role", "目标岗位"], ["notes", "投递备注"] ] as const).map(([key, label]) => <label className="flow-field" key={key}>{label}<input value={target[key]} onChange={(e) => setTarget({ ...target, [key]: e.target.value })} /></label>)}</div>
    <div className="flow-actions"><button className="secondary-button" onClick={() => { onUpdate(target); setMessage("当前简历的岗位信息已更新"); }}>保存岗位信息</button><button className="primary-button" disabled={busy || !(target.company.trim() || target.role.trim())} onClick={() => void run(() => onCreate(jobVersion(resume, target.company, target.role, target.notes)), "已创建岗位版本")}>基于当前简历创建岗位版</button></div>
    <p>最近修改：{new Date(resume.updatedAt).toLocaleString()}<br />最近发起下载：{resume.lastExport ? `${new Date(resume.lastExport.at).toLocaleString()} · ${resume.lastExport.filename}` : "尚无下载记录"}</p>
    <label className="flow-field">与哪个版本对比<select value={compareId} onChange={(e) => setCompareId(e.target.value)}><option value="">请选择</option>{resume.lastExport && <option value="last-export">最近下载时的内容</option>}{library.resumes.filter((s) => s.id !== library.activeResumeId).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
    {other && <><p>左侧为所选版本，右侧为当前简历。{differences.length ? `共 ${differences.length} 处变化。` : "内容相同。"}</p><ul className="flow-list">{differences.map((d) => <li key={d.label}><strong>{d.label}</strong><div className="version-diff"><pre>{d.before}</pre><pre>{d.after}</pre></div></li>)}</ul></>}
    <details><summary>同步当前联系方式到其他版本</summary><p>只更新手机、邮箱和所在地，岗位经历保持独立。</p>{library.resumes.filter((s) => s.id !== library.activeResumeId).map((s) => <label className="restore-choice" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))} />{s.title}</label>)}<button className="secondary-button" disabled={busy || !selected.length} onClick={() => void run(() => onSyncContacts(selected), "所选版本的联系方式已更新")}>同步到所选版本</button></details>
    {message && <p role="status">{message}</p>}<div className="flow-actions"><button className="secondary-button" disabled={busy} onClick={onClose}>关闭</button></div>
  </Modal>;
}
