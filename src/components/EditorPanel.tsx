import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type {
  AwardsSection,
  CustomContentNode,
  CustomNodeType,
  CustomSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  ResumeDocument,
  ResumeProfile,
  ResumeSection,
  SkillsSection,
} from "../model/resume";
import { createCustomNode, duplicateCustomNode } from "../model/resume";
import { sanitizeRichText } from "../model/richText";

const makeId = () => crypto.randomUUID();

interface EditorPanelProps {
  resume: ResumeDocument;
  selectedId: string;
  onProfileChange: (profile: ResumeProfile) => void;
  onSectionChange: (section: ResumeSection) => void;
  onDeleteSection: (sectionId: string) => void;
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
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
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
        <button type="button" className="remove-item" onClick={onDelete} title="删除条目">
          ×
        </button>
      )}
      {children}
    </div>
  );
}

function BulletsEditor({ bullets, onChange }: { bullets: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="field field-wide bullet-editor">
      <span>要点</span>
      {bullets.map((bullet, index) => (
        <div className="inline-field" key={index}>
          <span className="bullet-dot">•</span>
          <textarea
            rows={2}
            value={bullet}
            onChange={(event) =>
              onChange(bullets.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
            }
          />
          <button
            type="button"
            className="icon-button danger"
            onClick={() => onChange(bullets.filter((_, itemIndex) => itemIndex !== index))}
            aria-label="删除要点"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="text-button" onClick={() => onChange([...bullets, ""])}>
        ＋ 添加要点
      </button>
    </div>
  );
}

function ProfileEditor({ profile, onChange }: { profile: ResumeProfile; onChange: (value: ResumeProfile) => void }) {
  const update = <K extends keyof ResumeProfile>(key: K, value: ResumeProfile[K]) =>
    onChange({ ...profile, [key]: value });

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
      <div className="editor-title">
        <div>
          <span className="eyebrow">固定模块</span>
          <h2>个人信息</h2>
        </div>
      </div>
      <div className="field-grid">
        <Field label="姓名" value={profile.name} onChange={(value) => update("name", value)} />
        <Field label="求职方向" value={profile.headline} onChange={(value) => update("headline", value)} />
        <Field label="年龄 / 性别" value={profile.ageGender} onChange={(value) => update("ageGender", value)} />
        <Field label="所在地" value={profile.location} onChange={(value) => update("location", value)} />
        <Field label="手机" value={profile.phone} onChange={(value) => update("phone", value)} />
        <Field label="邮箱" value={profile.email} onChange={(value) => update("email", value)} />
      </div>

      <div className="photo-control">
        <div className="photo-thumb">
          {profile.photo ? <img src={profile.photo} alt="证件照预览" /> : <span>照片</span>}
        </div>
        <div>
          <strong>证件照</strong>
          <p>建议使用 3:4 竖版照片，最大 4MB。</p>
          <label className="secondary-button file-button">
            选择照片
            <input type="file" accept="image/*" onChange={uploadPhoto} />
          </label>
          {profile.photo && (
            <button type="button" className="text-button danger-text" onClick={() => update("photo", "")}>
              移除
            </button>
          )}
        </div>
      </div>

      <div className="subheading-row">
        <h3>扩展信息</h3>
        <button
          type="button"
          className="text-button"
          onClick={() => update("details", [...profile.details, { id: makeId(), label: "", value: "" }])}
        >
          ＋ 添加字段
        </button>
      </div>
      {profile.details.map((detail) => (
        <div className="detail-row" key={detail.id}>
          <input
            aria-label="字段名称"
            value={detail.label}
            placeholder="字段名称"
            onChange={(event) =>
              update(
                "details",
                profile.details.map((item) =>
                  item.id === detail.id ? { ...item, label: event.target.value } : item,
                ),
              )
            }
          />
          <input
            aria-label="字段内容"
            value={detail.value}
            placeholder="字段内容"
            onChange={(event) =>
              update(
                "details",
                profile.details.map((item) =>
                  item.id === detail.id ? { ...item, value: event.target.value } : item,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-button danger"
            onClick={() => update("details", profile.details.filter((item) => item.id !== detail.id))}
          >
            ×
          </button>
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

function ProjectsEditor({ section, onChange }: { section: ProjectsSection; onChange: (value: ProjectsSection) => void }) {
  return (
    <>
      {section.items.map((item) => {
        const updateItem = (patch: Partial<typeof item>) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
        return (
          <EditorCard key={item.id} onDelete={() => onChange({ ...section, items: section.items.filter((entry) => entry.id !== item.id) })}>
            <div className="field-grid">
              <Field label="项目名称" value={item.name} onChange={(value) => updateItem({ name: value })} />
              <Field label="职责" value={item.role} onChange={(value) => updateItem({ role: value })} />
              <Field label="时间" value={item.date} onChange={(value) => updateItem({ date: value })} />
              <Field label="技术栈" value={item.stack} onChange={(value) => updateItem({ stack: value })} />
              <Field label="项目简介" value={item.summary} multiline onChange={(value) => updateItem({ summary: value })} />
              <BulletsEditor bullets={item.bullets} onChange={(value) => updateItem({ bullets: value })} />
            </div>
          </EditorCard>
        );
      })}
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, items: [...section.items, { id: makeId(), name: "", role: "", date: "", stack: "", summary: "", bullets: [""] }] })}>＋ 添加项目</button>
    </>
  );
}

function ExperienceEditor({ section, onChange }: { section: ExperienceSection; onChange: (value: ExperienceSection) => void }) {
  return (
    <>
      {section.items.map((item) => {
        const updateItem = (patch: Partial<typeof item>) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
        return (
          <EditorCard key={item.id} onDelete={() => onChange({ ...section, items: section.items.filter((entry) => entry.id !== item.id) })}>
            <div className="field-grid">
              <Field label="公司" value={item.company} onChange={(value) => updateItem({ company: value })} />
              <Field label="职位" value={item.role} onChange={(value) => updateItem({ role: value })} />
              <Field label="时间" value={item.date} onChange={(value) => updateItem({ date: value })} />
              <Field label="经历简介" value={item.summary} multiline onChange={(value) => updateItem({ summary: value })} />
              <BulletsEditor bullets={item.bullets} onChange={(value) => updateItem({ bullets: value })} />
            </div>
          </EditorCard>
        );
      })}
      <button type="button" className="add-item-button" onClick={() => onChange({ ...section, items: [...section.items, { id: makeId(), company: "", role: "", date: "", summary: "", bullets: [""] }] })}>＋ 添加工作经历</button>
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

const customNodeLabels: Record<CustomNodeType, string> = {
  title: "标题日期行",
  paragraph: "说明段落",
  bullets: "要点列表",
  keyValues: "键值字段",
};

function updateCustomNode(section: CustomSection, node: CustomContentNode): CustomSection {
  return { ...section, nodes: section.nodes.map((item) => item.id === node.id ? node : item) };
}

function CustomNodeFields({
  node,
  mode,
  onChange,
}: {
  node: CustomContentNode;
  mode: "builder" | "document";
  onChange: (node: CustomContentNode) => void;
}) {
  if (node.type === "title") {
    if (mode === "document") {
      return (
        <div className="document-title-row">
          <input aria-label="标题" placeholder="标题或名称" value={node.title} onChange={(event) => onChange({ ...node, title: event.target.value })} />
          <input aria-label="副标题" placeholder="角色 / 副标题" value={node.subtitle} onChange={(event) => onChange({ ...node, subtitle: event.target.value })} />
          <input aria-label="时间" placeholder="时间" value={node.date} onChange={(event) => onChange({ ...node, date: event.target.value })} />
        </div>
      );
    }
    return (
      <div className="field-grid">
        <Field label="标题" value={node.title} onChange={(value) => onChange({ ...node, title: value })} />
        <Field label="副标题" value={node.subtitle} onChange={(value) => onChange({ ...node, subtitle: value })} />
        <Field label="时间" value={node.date} onChange={(value) => onChange({ ...node, date: value })} />
      </div>
    );
  }

  if (node.type === "paragraph") {
    return mode === "document"
      ? <textarea className="document-paragraph-input" rows={3} aria-label="说明段落" placeholder="直接输入一段内容……" value={node.text} onChange={(event) => onChange({ ...node, text: event.target.value })} />
      : <Field label="说明" value={node.text} multiline onChange={(value) => onChange({ ...node, text: value })} />;
  }

  if (node.type === "bullets") {
    return (
      <div className={mode === "document" ? "document-bullets" : "field field-wide bullet-editor"}>
        {mode === "builder" && <span>要点</span>}
        {node.items.map((item) => (
          <div className="inline-field" key={item.id}>
            <span className="bullet-dot">•</span>
            <textarea
              rows={mode === "document" ? 1 : 2}
              aria-label="要点内容"
              value={item.text}
              onChange={(event) => onChange({ ...node, items: node.items.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry) })}
            />
            <button type="button" className="icon-button danger" aria-label="删除要点" onClick={() => onChange({ ...node, items: node.items.filter((entry) => entry.id !== item.id) })}>×</button>
          </div>
        ))}
        <button type="button" className="text-button" onClick={() => onChange({ ...node, items: [...node.items, { id: makeId(), text: "" }] })}>＋ 添加要点</button>
      </div>
    );
  }

  return (
    <div className="custom-key-values">
      {node.pairs.map((pair) => (
        <div className="detail-row" key={pair.id}>
          <input aria-label="字段名称" placeholder="字段名称" value={pair.label} onChange={(event) => onChange({ ...node, pairs: node.pairs.map((entry) => entry.id === pair.id ? { ...entry, label: event.target.value } : entry) })} />
          <input aria-label="字段内容" placeholder="字段内容" value={pair.value} onChange={(event) => onChange({ ...node, pairs: node.pairs.map((entry) => entry.id === pair.id ? { ...entry, value: event.target.value } : entry) })} />
          <button type="button" className="icon-button danger" aria-label="删除字段" onClick={() => onChange({ ...node, pairs: node.pairs.filter((entry) => entry.id !== pair.id) })}>×</button>
        </div>
      ))}
      <button type="button" className="text-button" onClick={() => onChange({ ...node, pairs: [...node.pairs, { id: makeId(), label: "", value: "" }] })}>＋ 添加字段</button>
    </div>
  );
}

function CustomStructuredEditor({ section, onChange }: { section: CustomSection; onChange: (value: CustomSection) => void }) {
  const [newNodeType, setNewNodeType] = useState<CustomNodeType>("paragraph");
  const mode = section.editorMode === "builder" ? "builder" : "document";
  const moveNode = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.nodes.length) return;
    const nodes = [...section.nodes];
    [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    onChange({ ...section, nodes });
  };

  return (
    <>
      <div className="custom-mode-switch" aria-label="结构化模块编辑方式">
        <button type="button" className={mode === "builder" ? "active" : ""} onClick={() => onChange({ ...section, editorMode: "builder" })}>结构搭建</button>
        <button type="button" className={mode === "document" ? "active" : ""} onClick={() => onChange({ ...section, editorMode: "document" })}>自由文档</button>
        <span>两种视图共享内容，可随时切换</span>
      </div>
      <div className={mode === "document" ? "custom-document-canvas" : "custom-builder-list"}>
        {section.nodes.map((node, index) => (
          <div className={`custom-node ${mode} ${node.enabled ? "" : "node-hidden"}`} key={node.id}>
            <div className="custom-node-toolbar">
              <span><i>⋮⋮</i>{mode === "builder" && <strong>{customNodeLabels[node.type]}</strong>}</span>
              <div>
                <button type="button" className="icon-button" title="上移" disabled={index === 0} onClick={() => moveNode(index, -1)}>↑</button>
                <button type="button" className="icon-button" title="下移" disabled={index === section.nodes.length - 1} onClick={() => moveNode(index, 1)}>↓</button>
                <button type="button" className="icon-button" title={node.enabled ? "隐藏内容" : "显示内容"} onClick={() => onChange(updateCustomNode(section, { ...node, enabled: !node.enabled }))}>{node.enabled ? "◉" : "○"}</button>
                <button type="button" className="icon-button" title="复制内容" onClick={() => {
                  const nodes = [...section.nodes];
                  nodes.splice(index + 1, 0, duplicateCustomNode(node));
                  onChange({ ...section, nodes });
                }}>⧉</button>
                <button type="button" className="icon-button danger" title="删除内容" onClick={() => onChange({ ...section, nodes: section.nodes.filter((item) => item.id !== node.id) })}>×</button>
              </div>
            </div>
            <div className="custom-node-content">
              <CustomNodeFields node={node} mode={mode} onChange={(value) => onChange(updateCustomNode(section, value))} />
            </div>
          </div>
        ))}
        {!section.nodes.length && <div className="custom-empty-state">还没有内容，可以从下方添加标题、段落、列表或字段。</div>}
      </div>
      <div className="custom-add-node">
        <select value={newNodeType} onChange={(event) => setNewNodeType(event.target.value as CustomNodeType)}>
          {(Object.keys(customNodeLabels) as CustomNodeType[]).map((type) => <option value={type} key={type}>{customNodeLabels[type]}</option>)}
        </select>
        <button type="button" className="add-item-button" onClick={() => onChange({ ...section, nodes: [...section.nodes, createCustomNode(newNodeType)] })}>＋ 添加内容</button>
      </div>
    </>
  );
}

function RichTextEditor({ section, onChange }: { section: CustomSection; onChange: (value: CustomSection) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const safeHtml = sanitizeRichText(section.richText);
    if (editor.innerHTML !== safeHtml) editor.innerHTML = safeHtml;
  }, [section.id, section.richText]);

  const commit = () => {
    const editor = editorRef.current;
    if (editor) onChange({ ...section, richText: sanitizeRichText(editor.innerHTML) });
  };
  const applyCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    commit();
  };

  return (
    <>
      <div className="rich-text-notice">富文本适合自由输入和粘贴；同一份简历可以与其他模块混用。</div>
      <div className="rich-text-editor-shell">
        <div className="rich-text-toolbar" aria-label="富文本格式工具">
          <button type="button" title="加粗" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")}><strong>B</strong></button>
          <button type="button" title="斜体" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")}><em>I</em></button>
          <button type="button" title="下划线" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("underline")}><u>U</u></button>
          <button type="button" title="无序列表" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertUnorderedList")}>• 列表</button>
          <button type="button" title="有序列表" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertOrderedList")}>1. 列表</button>
          <button type="button" title="添加链接" onMouseDown={(event) => event.preventDefault()} onClick={() => {
            const href = window.prompt("请输入链接地址", "https://");
            if (href) applyCommand("createLink", href);
          }}>链接</button>
          <button type="button" title="清除格式" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("removeFormat")}>清除格式</button>
        </div>
        <div
          ref={editorRef}
          className="rich-text-surface"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="直接输入或粘贴内容……"
          onInput={commit}
          onBlur={commit}
        />
      </div>
    </>
  );
}

function CustomEditor({ section, onChange }: { section: CustomSection; onChange: (value: CustomSection) => void }) {
  return section.editorMode === "richtext"
    ? <RichTextEditor section={section} onChange={onChange} />
    : <CustomStructuredEditor section={section} onChange={onChange} />;
}

export function EditorPanel({ resume, selectedId, onProfileChange, onSectionChange, onDeleteSection }: EditorPanelProps) {
  if (selectedId === "profile") {
    return <section className="editor panel"><ProfileEditor profile={resume.profile} onChange={onProfileChange} /></section>;
  }

  const section = resume.sections.find((item) => item.id === selectedId);
  if (!section) return null;

  return (
    <section className="editor panel">
      <div className="editor-title">
        <div>
          <span className="eyebrow">{section.type}</span>
          <input className="section-title-input" value={section.title} aria-label="板块标题" onChange={(event) => onSectionChange({ ...section, title: event.target.value })} />
        </div>
        <button type="button" className="secondary-button danger-text" onClick={() => onDeleteSection(section.id)}>删除模块</button>
      </div>
      {section.type === "education" && <EducationEditor section={section} onChange={onSectionChange} />}
      {section.type === "skills" && <SkillsEditor section={section} onChange={onSectionChange} />}
      {section.type === "projects" && <ProjectsEditor section={section} onChange={onSectionChange} />}
      {section.type === "experience" && <ExperienceEditor section={section} onChange={onSectionChange} />}
      {section.type === "awards" && <AwardsEditor section={section} onChange={onSectionChange} />}
      {section.type === "custom" && <CustomEditor section={section} onChange={onSectionChange} />}
    </section>
  );
}
