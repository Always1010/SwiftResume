export type Density = number;

export const MIN_DENSITY = 0;
export const DEFAULT_DENSITY = 50;
export const MAX_DENSITY = 100;

export const RESUME_TEMPLATE_IDS = ["classic", "minimal", "executive", "sidebar", "accent", "timeline", "academic", "developer", "compact"] as const;
export type ResumeTemplateId = typeof RESUME_TEMPLATE_IDS[number];
export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "classic";

export function normalizeResumeTemplateId(value: unknown): ResumeTemplateId {
  return typeof value === "string" && (RESUME_TEMPLATE_IDS as readonly string[]).includes(value)
    ? value as ResumeTemplateId
    : DEFAULT_RESUME_TEMPLATE;
}

export interface DensityLayout {
  fontSizePx: number;
  sectionSpacePx: number;
  entrySpacePx: number;
  bodyLine: number;
  typstFontSizePt: number;
  typstLeadingEm: number;
  typstGapPt: number;
}

function interpolateDensity(value: number, compact: number, standard: number, comfortable: number) {
  const [start, end, progress] = value <= DEFAULT_DENSITY
    ? [compact, standard, value / DEFAULT_DENSITY]
    : [standard, comfortable, (value - DEFAULT_DENSITY) / (MAX_DENSITY - DEFAULT_DENSITY)];
  return start + (end - start) * progress;
}

export function normalizeDensity(value: unknown): Density {
  if (value === "compact") return MIN_DENSITY;
  if (value === "standard") return DEFAULT_DENSITY;
  if (value === "comfortable") return MAX_DENSITY;
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_DENSITY;
  return Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, Math.round(value)));
}

export function getDensityLayout(value: unknown): DensityLayout {
  const density = normalizeDensity(value);
  return {
    fontSizePx: interpolateDensity(density, 10.8, 11.5, 11.5),
    sectionSpacePx: interpolateDensity(density, 10, 14, 17),
    entrySpacePx: interpolateDensity(density, 7, 10, 13),
    bodyLine: interpolateDensity(density, 1.32, 1.42, 1.52),
    typstFontSizePt: interpolateDensity(density, 8.3, 8.8, 9.2),
    typstLeadingEm: interpolateDensity(density, 0.32, 0.42, 0.52),
    typstGapPt: interpolateDensity(density, 4, 6, 8),
  };
}

export type SectionType = "education" | "content";

export interface ResumeProfile {
  name: string;
  headline: string;
  ageGender: string;
  location: string;
  phone: string;
  email: string;
  photo: string;
  details: Array<{ id: string; label: string; value: string }>;
}

interface SectionBase {
  id: string;
  type: SectionType;
  title: string;
  enabled: boolean;
}

export interface EducationItem {
  id: string;
  school: string;
  date: string;
  major: string;
  degree: string;
  detail: string;
}

export interface EducationSection extends SectionBase {
  type: "education";
  items: EducationItem[];
}

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
}

export interface RichTextDocument extends RichTextNode {
  type: "doc";
}

export interface ContentEntry {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  body: RichTextDocument;
}

export interface ContentSection extends SectionBase {
  type: "content";
  entries: ContentEntry[];
}

export type ResumeSection = EducationSection | ContentSection;

export interface ResumeDocument {
  schemaVersion: 2;
  title: string;
  profile: ResumeProfile;
  theme: { accent: string; density: Density; templateId: ResumeTemplateId };
  sections: ResumeSection[];
  updatedAt: string;
}

export type ResumeAction =
  | { type: "replace"; value: ResumeDocument }
  | { type: "update-title"; value: string }
  | { type: "update-profile"; value: ResumeProfile }
  | { type: "update-theme"; value: Partial<ResumeDocument["theme"]> }
  | { type: "set-sections"; value: ResumeSection[] };

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createEmptyRichText(): RichTextDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function text(textValue: string, bold = false): RichTextNode {
  return { type: "text", text: textValue, ...(bold ? { marks: [{ type: "bold" }] } : {}) };
}

function paragraph(content: RichTextNode[]): RichTextNode {
  return { type: "paragraph", content };
}

function projectBody(): RichTextDocument {
  return {
    type: "doc",
    content: [
      paragraph([text("开发工具：", true), text("C++ · CMake · GDB · Postman")]),
      paragraph([text("项目描述：", true), text("基于 Linux 的高并发 HTTP 服务器，支持静态资源访问与连接管理。")]),
      paragraph([text("主要内容：", true)]),
      {
        type: "bulletList",
        content: [
          "使用 epoll 与线程池实现 Reactor 高并发模型。",
          "实现 GET、POST 请求解析、定时器和异步日志模块。",
          "完成压力测试与性能分析，在实验环境中稳定处理高并发请求。",
        ].map((value) => ({ type: "listItem", content: [paragraph([text(value)])] })),
      },
    ],
  };
}

function skillsBody(): RichTextDocument {
  return {
    type: "doc",
    content: [{
      type: "bulletList",
      content: [
        "熟练掌握 C/C++ 基本语法，熟悉 C++17/20 常用特性。",
        "熟悉 STL 常用容器、模板编程及常见数据结构与算法。",
        "熟悉 Linux、网络编程及 HTTP、TCP、UDP 等常见协议。",
      ].map((value) => ({ type: "listItem", content: [paragraph([text(value)])] })),
    }],
  };
}

export function createContentEntry(): ContentEntry {
  return { id: makeId(), title: "", subtitle: "", date: "", body: createEmptyRichText() };
}

export function createDefaultResume(): ResumeDocument {
  return {
    schemaVersion: 2,
    title: "我的中文简历",
    updatedAt: new Date().toISOString(),
    theme: { accent: "#596d82", density: DEFAULT_DENSITY, templateId: DEFAULT_RESUME_TEMPLATE },
    profile: {
      name: "林同学",
      headline: "后端开发工程师",
      ageGender: "24岁 · 男",
      location: "现居：上海",
      phone: "138 0000 0000",
      email: "hello@example.com",
      photo: "",
      details: [
        { id: makeId(), label: "民族", value: "汉族" },
        { id: makeId(), label: "学历", value: "本科" },
        { id: makeId(), label: "求职状态", value: "在职，考虑机会" },
      ],
    },
    sections: [
      {
        id: makeId(),
        type: "education",
        title: "教育背景",
        enabled: true,
        items: [{ id: makeId(), school: "某某大学", date: "2021.09 – 2025.06", major: "计算机科学与技术", degree: "本科", detail: "GPA 3.7/5.0 · 专业前 20%" }],
      },
      {
        id: makeId(),
        type: "content",
        title: "专业技能",
        enabled: true,
        entries: [{ id: makeId(), title: "", subtitle: "", date: "", body: skillsBody() }],
      },
      {
        id: makeId(),
        type: "content",
        title: "项目经历",
        enabled: true,
        entries: [{ id: makeId(), title: "轻量级 HTTP 服务器", subtitle: "核心开发", date: "2024.07 – 2024.09", body: projectBody() }],
      },
    ],
  };
}

export function createBlankResume(): ResumeDocument {
  const resume = createDefaultResume();
  return {
    ...resume,
    title: "未命名简历",
    profile: { name: "", headline: "", ageGender: "", location: "", phone: "", email: "", photo: "", details: [] },
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createStarterResume(): ResumeDocument {
  const resume = createBlankResume();
  const content = (title: string) => ({ ...(createSection("content") as ContentSection), title });
  return {
    ...resume,
    sections: [content("求职意向"), content("工作经历"), content("项目经历"), createSection("education"), content("专业技能"), content("自我评价")],
  };
}

export function duplicateResume(resume: ResumeDocument): ResumeDocument {
  const copy = structuredClone(resume);
  copy.title = `${copy.title || "未命名简历"} 副本`;
  copy.updatedAt = new Date().toISOString();
  return copy;
}

export function createSection(type: SectionType): ResumeSection {
  const id = makeId();
  switch (type) {
    case "education":
      return { id, type, title: "教育背景", enabled: true, items: [{ id: makeId(), school: "", date: "", major: "", degree: "", detail: "" }] };
    case "content":
      return { id, type, title: "自定义模块", enabled: true, entries: [createContentEntry()] };
  }
}

function duplicateEntry(entry: ContentEntry): ContentEntry {
  return { ...structuredClone(entry), id: makeId() };
}

export function duplicateSection(section: ResumeSection): ResumeSection {
  const copy = structuredClone(section);
  copy.id = makeId();
  copy.title = `${copy.title}副本`;
  if (copy.type === "content") {
    copy.entries = copy.entries.map(duplicateEntry);
  } else {
    copy.items = copy.items.map((item) => ({ ...item, id: makeId() })) as typeof copy.items;
  }
  return copy;
}

export function moveSection(sections: ResumeSection[], sectionId: string, direction: -1 | 1): ResumeSection[] {
  const index = sections.findIndex((section) => section.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function reorderSection(sections: ResumeSection[], sourceId: string, targetId: string): ResumeSection[] {
  const from = sections.findIndex((section) => section.id === sourceId);
  const to = sections.findIndex((section) => section.id === targetId);
  if (from < 0 || to < 0 || from === to) return sections;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function resumeReducer(state: ResumeDocument, action: ResumeAction): ResumeDocument {
  if (action.type === "replace") return action.value;
  const updatedAt = new Date().toISOString();
  switch (action.type) {
    case "update-title": return { ...state, title: action.value, updatedAt };
    case "update-profile": return { ...state, profile: action.value, updatedAt };
    case "update-theme": return { ...state, theme: { ...state.theme, ...action.value }, updatedAt };
    case "set-sections": return { ...state, sections: action.value, updatedAt };
  }
}

export function isResumeDocument(value: unknown): value is ResumeDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResumeDocument>;
  return candidate.schemaVersion === 2 && typeof candidate.title === "string" && Boolean(candidate.profile) && Boolean(candidate.theme) && Array.isArray(candidate.sections);
}

export function normalizeResumeDocument(value: unknown): ResumeDocument | null {
  if (!isResumeDocument(value)) return null;
  const resume = structuredClone(value);
  resume.theme.density = normalizeDensity(resume.theme.density);
  resume.theme.templateId = normalizeResumeTemplateId(resume.theme.templateId);
  return resume;
}
