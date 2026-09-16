import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { ContentEntry, ContentSection, EducationSection, ProfilePhotoCrop, ResumeDocument, ResumeProfile, ResumeSection } from "../model/resume";
import { createContentEntry, DEFAULT_PROFILE_PHOTO_CROP } from "../model/resume";
import { createCroppedPhoto, drawCroppedPhoto, loadPhotoImage } from "../model/profilePhoto";
import { ContentBodyEditor } from "./customEditors/ContentBodyEditor";

const makeId = () => crypto.randomUUID();

const PHOTO_BACKGROUNDS = [
  { label: "透明", value: "transparent" },
  { label: "白色", value: "#FFFFFF" },
  { label: "蓝色", value: "#438EDB" },
  { label: "浅蓝", value: "#DCEEFF" },
  { label: "红色", value: "#D94141" },
  { label: "浅灰", value: "#F2F4F7" },
] as const;

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

function PhotoCropDialog({
  source,
  initialCrop,
  background,
  onCancel,
  onSave,
}: {
  source: string;
  initialCrop: ProfilePhotoCrop;
  background: string;
  onCancel: () => void;
  onSave: (photo: string, crop: ProfilePhotoCrop) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState(initialCrop);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadPhotoImage(source).then((image) => {
      if (active && canvasRef.current) drawCroppedPhoto(canvasRef.current, image, crop);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法读取图片");
    });
    return () => { active = false; };
  }, [source, crop]);

  const updateCrop = (key: keyof ProfilePhotoCrop, value: number) => setCrop((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      onSave(await createCroppedPhoto(source, crop), crop);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "照片裁切失败");
      setSaving(false);
    }
  };

  return (
    <div className="photo-crop-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="photo-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-crop-title">
        <div className="photo-crop-heading">
          <div><span className="eyebrow">3:4 证件照比例</span><h3 id="photo-crop-title">裁切头像</h3></div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="关闭裁切">×</button>
        </div>
        <div className={`photo-crop-stage ${background === "transparent" ? "transparent-grid" : ""}`} style={background === "transparent" ? undefined : { backgroundColor: background }}>
          <canvas ref={canvasRef} width="360" height="480" aria-label="头像裁切预览" />
          <span className="photo-crop-guide" aria-hidden="true" />
        </div>
        <div className="photo-crop-controls">
          <label><span>缩放</span><input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(event) => updateCrop("zoom", Number(event.target.value))} /><output>{Math.round(crop.zoom * 100)}%</output></label>
          <label><span>水平位置</span><input type="range" min="-100" max="100" value={crop.offsetX} onChange={(event) => updateCrop("offsetX", Number(event.target.value))} /><output>{crop.offsetX}</output></label>
          <label><span>垂直位置</span><input type="range" min="-100" max="100" value={crop.offsetY} onChange={(event) => updateCrop("offsetY", Number(event.target.value))} /><output>{crop.offsetY}</output></label>
        </div>
        {error && <p className="photo-crop-error">{error}</p>}
        <div className="photo-crop-actions">
          <button type="button" className="secondary-button" onClick={() => setCrop({ ...DEFAULT_PROFILE_PHOTO_CROP })}>恢复居中</button>
          <span />
          <button type="button" className="secondary-button" onClick={onCancel}>取消</button>
          <button type="button" className="primary-button" disabled={saving || Boolean(error)} onClick={save}>{saving ? "处理中…" : "应用裁切"}</button>
        </div>
      </section>
    </div>
  );
}

function ProfileEditor({ profile, onChange }: { profile: ResumeProfile; onChange: (value: ResumeProfile) => void }) {
  const update = <K extends keyof ResumeProfile>(key: K, value: ResumeProfile[K]) => onChange({ ...profile, [key]: value });
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropInitial, setCropInitial] = useState<ProfilePhotoCrop>({ ...DEFAULT_PROFILE_PHOTO_CROP });
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert("照片请控制在 4MB 以内。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropInitial({ ...DEFAULT_PROFILE_PHOTO_CROP });
      setCropSource(String(reader.result));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openCrop = () => {
    if (!profile.photo) return;
    setCropInitial(profile.photoSource ? profile.photoCrop : { ...DEFAULT_PROFILE_PHOTO_CROP });
    setCropSource(profile.photoSource || profile.photo);
  };
  const removePhoto = () => onChange({
    ...profile,
    photo: "",
    photoSource: "",
    photoCrop: { ...DEFAULT_PROFILE_PHOTO_CROP },
  });
  const applyCrop = (photo: string, crop: ProfilePhotoCrop) => {
    onChange({ ...profile, photo, photoSource: cropSource ?? profile.photoSource, photoCrop: crop });
    setCropSource(null);
  };
  const customBackground = /^#[0-9a-f]{6}$/i.test(profile.photoBackground) ? profile.photoBackground : "#FFFFFF";

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
        <div className={`photo-thumb ${profile.photoBackground === "transparent" ? "transparent-grid" : ""}`} style={profile.photoBackground === "transparent" ? undefined : { backgroundColor: profile.photoBackground }}>
          {profile.photo ? <img src={profile.photo} alt="证件照预览" /> : <span>照片</span>}
        </div>
        <div className="photo-control-body">
          <strong>证件照</strong><p>支持选择任意图片格式，上传后可按 3:4 比例裁切，最大 4MB。</p>
          <div className="photo-actions">
            <label className="secondary-button file-button">选择照片<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
            {profile.photo && <button type="button" className="secondary-button" onClick={openCrop}>重新裁切</button>}
            {profile.photo && <button type="button" className="text-button danger-text" onClick={removePhoto}>移除</button>}
          </div>
          <div className="photo-background-control">
            <span>照片底色</span>
            <div className="photo-background-options">
              {PHOTO_BACKGROUNDS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`${option.value === "transparent" ? "transparent-grid" : ""} ${profile.photoBackground === option.value ? "selected" : ""}`}
                  style={option.value === "transparent" ? undefined : { backgroundColor: option.value }}
                  aria-label={`${option.label}背景`}
                  title={option.label}
                  onClick={() => update("photoBackground", option.value)}
                />
              ))}
              <label className="photo-custom-color" title="自定义背景色">
                <input type="color" value={customBackground} aria-label="自定义照片背景色" onChange={(event) => update("photoBackground", event.target.value.toUpperCase())} />
                <span>自定义</span>
              </label>
            </div>
            <p className="photo-background-hint">如需更换人像底色，请上传带透明背景的图片；底色只会显示在图片的透明区域。</p>
          </div>
        </div>
      </div>
      {cropSource && (
        <PhotoCropDialog
          source={cropSource}
          initialCrop={cropInitial}
          background={profile.photoBackground}
          onCancel={() => setCropSource(null)}
          onSave={applyCrop}
        />
      )}
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

function entryLabels(_type: ContentSection["type"]) {
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
            <div className="content-body-label"><span>正文</span><small>支持高级文字格式、行高、缩进、对齐和表格</small></div>
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
      {section.type === "content" && <ContentSectionEditor section={section} onChange={onSectionChange} />}
    </section>
  );
}
