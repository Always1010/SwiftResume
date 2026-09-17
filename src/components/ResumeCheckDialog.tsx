import { useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { checkResume } from "../model/resumeChecks";
import { Modal } from "./Modal";
export function ResumeCheckDialog({ resume, onClose, onContinue, onLocate }: { resume: ResumeDocument; onClose: () => void; onContinue: () => void; onLocate?: (id: string) => void }) {
  const [ignored, setIgnored] = useState<string[]>([]);
  const checks = checkResume(resume);
  return <Modal titleId="check-title" className="flow-dialog" onClose={onClose}>
    <h2 id="check-title">导出前检查</h2><p>这些是本机规则提示，不代表招聘评价；请根据实际情况修改，也可以忽略后继续。</p>
    {!checks.length ? <p role="status">未发现明显的内容遗漏。接下来请在 PDF 中确认分页和版式。</p> : <ul className="flow-list">{checks.map((check) => <li key={check.id}>
      <span style={{ textDecoration: ignored.includes(check.id) ? "line-through" : undefined }}>{check.message}</span>
      <div className="flow-actions">{onLocate && <button className="secondary-button" onClick={() => onLocate(check.sectionId)}>定位修改</button>}<button className="secondary-button" onClick={() => setIgnored((ids) => ids.includes(check.id) ? ids.filter((id) => id !== check.id) : [...ids, check.id])}>{ignored.includes(check.id) ? "恢复提示" : "本次忽略"}</button></div>
    </li>)}</ul>}
    <div className="flow-actions"><button className="secondary-button" onClick={onClose}>返回编辑</button><button className="primary-button" onClick={onContinue}>{checks.some((check) => !ignored.includes(check.id)) ? "仍然继续导出" : "继续导出"}</button></div>
  </Modal>;
}
