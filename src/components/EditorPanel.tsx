import type { ChangeEvent, ReactNode } from "react";
import type {
  AwardsSection,
  ContentEntry,
  ContentSection,
  EducationSection,
  ResumeDocument,
  ResumeProfile,
  ResumeSection,
  SkillsSection,
} from "../model/resume";
import { createContentEntry } from "../model/resume";
import { ContentBodyEditor } from "./customEditors/ContentBodyEditor";

const makeId = () => crypto.randomUUID();

interface EditorPanelProps {
  resume: ResumeDocument;
  selectedId: string;
  onProfileChange: (profile: ResumeProfile) => void;
  onSectionChange: (section: ResumeSection) => void;
  onDeleteSection: (sectionId: string) => void;
  embedded?: boolean;
}

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}

function Field({ label, value, placeholder, multiline, onChange }: FieldProps) {
  const common = {
    value,
    placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  };
  return (
    <label className={`field ${multiline ? "field-wide" : ""}`}>
      <span>{label}</span>
      {multiline ? <textarea rows={3} {...common} /> : <input {...common} />}
    </label>
  );
}

function EditorCard({ children, onDelete }: { children: ReactNode; onDelete?: () => void }) {
  return (
    <div className="editor-card">
      {onDelete && (
        <button type="button" className="remove-item" onClick={onDelete} title="删除条目">×</button>
      )}
      {children}
    </div>
  );
}

function ProfileEditor({ profile, onChange }: { profile: ResumeProfile; onChange: (value: ResumeProfile) => void }) {
  const update = <K extends keyof ResumeProfile>(key: K, value: ResumeProfile[K]) => onChange({ ...profile, [key]: value });
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert("照片请控制在 4MB 以内。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("photo", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="editor-title"><div><span className="eyebrow">固定模块</span><h2>个人信息</h2></div></div>
      <div className="field-grid">
        <Field label="姓名" value={profile.name} onChange={(value) => update("name", value)} />
        <Field label="求职方向" value={profile.headline} onChange={(value) => update("headline", value)} />
        <Field label="年龄 / 性别" value={profile.ageGender} onChange={(value) => update("ageGender", value)} />
        <Field label="所在地" value={profile.location} onChange={(value) => update("location", value)} />
        <Field label="手机" value={profile.phone} onChange={(value) => update("phone", value)} />
        <Field label="邮箱" value={profile.email} onChange={(value) => update("email", value)} />
      </div>
      <div className="photo-control">
        <div className="photo-thumb">{profile.photo ? <img src={profile.photo} alt="证件照预览" /> : <span>照片</span>}</div>
        <div>
          <strong>证件照</strong><p>建议使用 3:4 竖版照片，最大 4MB。</p>
          <label className="secondary-button file-button">选择照片<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
          {profile.photo && <button type="button" className="text-button danger-text" onClick={() => update("photo", "")}>移除</button>}
        </div>
      </div>
      <div className="subheading-row">
        <h3>扩展信息</h3>
        <button type="button" className="text-button" onClick={() => update("details", [...profile.details, { id: makeId(), label: "", value: "" }])}>＋ 添加字段</button>
      </div>
      {profile.details.map((detail) => (
        <div className="detail-row" key={detail.id}>
          <input aria-label="字段名称" value={detail.label} placeholder="字段名称" onChange={(event) => update("details", profile.details.map((item) => item.id === detail.id ? { ...item, label: event.target.value } : item))} />
          <input aria-label="字段内容" value={detail.value} placeholder="字段内容" onChange={(event) => update("details", profile.details.map((item) => item.id === detail.id ? { ...item, value: event.target.value } : item))} />
          <button type="button" className="icon-button danger" onClick={() => update("details", profile.details.filter((item) => item.id !== detail.id))}>×</button>
        </div>
      ))}
    </>
  );
}

function EducationEditor({ section, onChange }: { section: EducationSection; onChange: (value: EducationSection) => void }) {
  return (
    <>
      {section.items.map((item) => (
        <EditorCard key={item.id} onDelete={() => onChange({ ...section, items: section.items.filter((entry) => entry.id !== item.id) })}>
          <div className="field-grid">
            <Field label="学校" value={item.school} onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, school: value } : entry) })} />
            <Field label="时间" value={item.date} onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, date: value } : entry) })} />
            <Field label="专业" value={item.major} onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, major: value } : entry) })} />
            <Field label="学历" value={item.degree} onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, degree: value } : entry) })} />
            <Field label="补充说明" value={item.detail} multiline onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, detail: value } : entry) })} />
          </div>
        </EditorCard>
      ))}
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, items: [...section.items, { id: makeId(), school: "", date: "", major: "", degree: "", detail: "" }] })}>＋ 添加教育经历</button>
    </>
  );
}

function SkillsEditor({ section, onChange }: { section: SkillsSection; onChange: (value: SkillsSection) => void }) {
  return (
    <>
      {section.items.map((item, index) => (
        <EditorCard key={item.id} onDelete={() => onChange({ ...section, items: section.items.filter((entry) => entry.id !== item.id) })}>
          <Field label={`技能 ${index + 1}`} value={item.text} multiline onChange={(value) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, text: value } : entry) })} />
        </EditorCard>
      ))}
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, items: [...section.items, { id: makeId(), text: "" }] })}>＋ 添加技能</button>
    </>
  );
}

function AwardsEditor({ section, onChange }: { section: AwardsSection; onChange: (value: AwardsSection) => void }) {
  return (
    <>
      {section.items.map((item) => {
        const updateItem = (patch: Partial<typeof item>) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
        return (
          <EditorCard key={item.id} onDelete={() => onChange({ ...section, items: section.items.filter((entry) => entry.id !== item.id) })}>
            <div className="field-grid">
              <Field label="荣誉名称" value={item.name} onChange={(value) => updateItem({ name: value })} />
              <Field label="时间" value={item.date} onChange={(value) => updateItem({ date: value })} />
              <Field label="补充说明" value={item.detail} multiline onChange={(value) => updateItem({ detail: value })} />
            </div>
          </EditorCard>
        );
      })}
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, items: [...section.items, { id: makeId(), name: "", date: "", detail: "" }] })}>＋ 添加荣誉</button>
    </>
  );
}

function entryLabels(type: ContentSection["type"]) {
  if (type === "projects") return { title: "项目名称（选填）", subtitle: "职责（选填）", titlePlaceholder: "例如：轻量级 HTTP 服务器", subtitlePlaceholder: "例如：核心开发", add: "添加项目" };
  if (type === "experience") return { title: "公司 / 组织（选填）", subtitle: "职位（选填）", titlePlaceholder: "例如：某某科技", subtitlePlaceholder: "例如：后端开发", add: "添加工作经历" };
  return { title: "标题 / 名称（选填）", subtitle: "补充信息（选填）", titlePlaceholder: "留空则只显示正文", subtitlePlaceholder: "角色、职位或其他说明", add: "添加内容条目" };
}

function ContentSectionEditor({ section, onChange }: { section: ContentSection; onChange: (value: ContentSection) => void }) {
  const labels = entryLabels(section.type);
  const replaceEntry = (entry: ContentEntry) => onChange({ ...section, entries: section.entries.map((item) => item.id === entry.id ? entry : item) });
  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.entries.length) return;
    const entries = [...section.entries];
    [entries[index], entries[target]] = [entries[target], entries[index]];
    onChange({ ...section, entries });
  };
  const duplicateEntry = (entry: ContentEntry, index: number) => {
    const copy = structuredClone(entry);
    copy.id = makeId();
    const entries = [...section.entries];
    entries.splice(index + 1, 0, copy);
    onChange({ ...section, entries });
  };

  return (
    <>
      <div className="content-editor-notice">
        <strong>标题行 + 富文本正文</strong>
        <span>标题、补充信息和时间均可留空；全部留空时，简历只显示正文。</span>
      </div>
      <div className="content-entry-list">
        {section.entries.map((entry, index) => (
          <article className="content-entry-editor" key={entry.id}>
            <div className="content-entry-actions">
              <strong>内容 {index + 1}</strong>
              <div>
                <button type="button" className="icon-button" title="上移" disabled={index === 0} onClick={() => moveEntry(index, -1)}>↑</button>
                <button type="button" className="icon-button" title="下移" disabled={index === section.entries.length - 1} onClick={() => moveEntry(index, 1)}>↓</button>
                <button type="button" className="icon-button" title="复制" onClick={() => duplicateEntry(entry, index)}>⧉</button>
                <button type="button" className="icon-button danger" title="删除" onClick={() => onChange({ ...section, entries: section.entries.filter((item) => item.id !== entry.id) })}>×</button>
              </div>
            </div>
            <div className="content-heading-fields">
              <Field label={labels.title} value={entry.title} placeholder={labels.titlePlaceholder} onChange={(title) => replaceEntry({ ...entry, title })} />
              <Field label={labels.subtitle} value={entry.subtitle} placeholder={labels.subtitlePlaceholder} onChange={(subtitle) => replaceEntry({ ...entry, subtitle })} />
              <Field label="时间（选填）" value={entry.date} placeholder="例如：2024.07 – 2024.09" onChange={(date) => replaceEntry({ ...entry, date })} />
            </div>
            <div className="content-body-label"><span>正文</span><small>支持局部加粗、列表、下划线和链接</small></div>
            <ContentBodyEditor entryId={entry.id} content={entry.body} onChange={(body) => replaceEntry({ ...entry, body })} />
          </article>
        ))}
        {!section.entries.length && <div className="custom-empty-state">还没有内容，点击下方按钮添加。</div>}
      </div>
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, entries: [...section.entries, createContentEntry()] })}>＋ {labels.add}</button>
    </>
  );
}

export function EditorPanel({ resume, selectedId, onProfileChange, onSectionChange, onDeleteSection, embedded = false }: EditorPanelProps) {
  const className = embedded ? "editor inline-module-editor" : "editor panel";
  if (selectedId === "profile") return <section className={className}><ProfileEditor profile={resume.profile} onChange={onProfileChange} /></section>;
  const section = resume.sections.find((item) => item.id === selectedId);
  if (!section) return null;

  return (
    <section className={className}>
      <div className="editor-title">
        <div><span className="eyebrow">{section.type}</span><input className="section-title-input" value={section.title} aria-label="板块标题" onChange={(event) => onSectionChange({ ...section, title: event.target.value })} /></div>
        <button type="button" className="secondary-button danger-text" onClick={() => onDeleteSection(section.id)}>删除模块</button>
      </div>
      {section.type === "education" && <EducationEditor section={section} onChange={onSectionChange} />}
      {section.type === "skills" && <SkillsEditor section={section} onChange={onSectionChange} />}
      {(section.type === "projects" || section.type === "experience" || section.type === "custom") && <ContentSectionEditor section={section} onChange={onSectionChange} />}
      {section.type === "awards" && <AwardsEditor section={section} onChange={onSectionChange} />}
    </section>
  );
}
