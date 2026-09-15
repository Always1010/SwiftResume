export type Density = "comfortable" | "standard" | "compact";

export type SectionType =
  | "education"
  | "skills"
  | "projects"
  | "experience"
  | "awards"
  | "custom";

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

export interface SkillsSection extends SectionBase {
  type: "skills";
  items: Array<{ id: string; text: string }>;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  date: string;
  stack: string;
  summary: string;
  bullets: string[];
}

export interface ProjectsSection extends SectionBase {
  type: "projects";
  items: ProjectItem[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  date: string;
  summary: string;
  bullets: string[];
}

export interface ExperienceSection extends SectionBase {
  type: "experience";
  items: ExperienceItem[];
}

export interface AwardsSection extends SectionBase {
  type: "awards";
  items: Array<{ id: string; name: string; date: string; detail: string }>;
}

export interface CustomSection extends SectionBase {
  type: "custom";
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    date: string;
    description: string;
    bullets: string[];
  }>;
}

export type ResumeSection =
  | EducationSection
  | SkillsSection
  | ProjectsSection
  | ExperienceSection
  | AwardsSection
  | CustomSection;

export interface ResumeDocument {
  schemaVersion: 1;
  title: string;
  profile: ResumeProfile;
  theme: {
    accent: string;
    density: Density;
  };
  sections: ResumeSection[];
  updatedAt: string;
}

export type ResumeAction =
  | { type: "replace"; value: ResumeDocument }
  | { type: "update-title"; value: string }
  | { type: "update-profile"; value: ResumeProfile }
  | { type: "update-theme"; value: Partial<ResumeDocument["theme"]> }
  | { type: "set-sections"; value: ResumeSection[] };

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createDefaultResume(): ResumeDocument {
  return {
    schemaVersion: 1,
    title: "我的中文简历",
    updatedAt: new Date().toISOString(),
    theme: { accent: "#596d82", density: "standard" },
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
        items: [
          {
            id: makeId(),
            school: "某某大学",
            date: "2021.09 – 2025.06",
            major: "计算机科学与技术",
            degree: "本科",
            detail: "GPA 3.7/5.0 · 专业前 20%",
          },
        ],
      },
      {
        id: makeId(),
        type: "skills",
        title: "专业技能",
        enabled: true,
        items: [
          { id: makeId(), text: "熟练掌握 C/C++ 基本语法，熟悉 C++17/20 常用特性。" },
          { id: makeId(), text: "熟悉 STL 常用容器、模板编程及常见数据结构与算法。" },
          { id: makeId(), text: "熟悉 Linux、网络编程及 HTTP、TCP、UDP 等常见协议。" },
        ],
      },
      {
        id: makeId(),
        type: "projects",
        title: "项目经历",
        enabled: true,
        items: [
          {
            id: makeId(),
            name: "轻量级 HTTP 服务器",
            role: "核心开发",
            date: "2024.07 – 2024.09",
            stack: "C++ · CMake · GDB · Postman",
            summary: "基于 Linux 的高并发 HTTP 服务器，支持静态资源访问与连接管理。",
            bullets: [
              "使用 epoll 与线程池实现 Reactor 高并发模型。",
              "实现 GET、POST 请求解析、定时器和异步日志模块。",
              "完成压力测试与性能分析，在实验环境中稳定处理高并发请求。",
            ],
          },
        ],
      },
      {
        id: makeId(),
        type: "awards",
        title: "个人荣誉",
        enabled: true,
        items: [
          { id: makeId(), name: "大学生程序设计竞赛", date: "2024", detail: "省级二等奖" },
        ],
      },
    ],
  };
}

export function createSection(type: SectionType): ResumeSection {
  const id = makeId();
  switch (type) {
    case "education":
      return {
        id,
        type,
        title: "教育背景",
        enabled: true,
        items: [{ id: makeId(), school: "", date: "", major: "", degree: "", detail: "" }],
      };
    case "skills":
      return { id, type, title: "专业技能", enabled: true, items: [{ id: makeId(), text: "" }] };
    case "projects":
      return {
        id,
        type,
        title: "项目经历",
        enabled: true,
        items: [
          { id: makeId(), name: "", role: "", date: "", stack: "", summary: "", bullets: [""] },
        ],
      };
    case "experience":
      return {
        id,
        type,
        title: "工作经历",
        enabled: true,
        items: [{ id: makeId(), company: "", role: "", date: "", summary: "", bullets: [""] }],
      };
    case "awards":
      return {
        id,
        type,
        title: "个人荣誉",
        enabled: true,
        items: [{ id: makeId(), name: "", date: "", detail: "" }],
      };
    case "custom":
      return {
        id,
        type,
        title: "自定义板块",
        enabled: true,
        items: [
          { id: makeId(), title: "", subtitle: "", date: "", description: "", bullets: [""] },
        ],
      };
  }
}

export function duplicateSection(section: ResumeSection): ResumeSection {
  const copy = structuredClone(section);
  copy.id = makeId();
  copy.title = `${copy.title}副本`;
  copy.items = copy.items.map((item) => ({ ...item, id: makeId() })) as typeof copy.items;
  return copy;
}

export function moveSection(
  sections: ResumeSection[],
  sectionId: string,
  direction: -1 | 1,
): ResumeSection[] {
  const index = sections.findIndex((section) => section.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function reorderSection(
  sections: ResumeSection[],
  sourceId: string,
  targetId: string,
): ResumeSection[] {
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
    case "update-title":
      return { ...state, title: action.value, updatedAt };
    case "update-profile":
      return { ...state, profile: action.value, updatedAt };
    case "update-theme":
      return { ...state, theme: { ...state.theme, ...action.value }, updatedAt };
    case "set-sections":
      return { ...state, sections: action.value, updatedAt };
  }
}

export function isResumeDocument(value: unknown): value is ResumeDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResumeDocument>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.title === "string" &&
    Boolean(candidate.profile) &&
    Boolean(candidate.theme) &&
    Array.isArray(candidate.sections)
  );
}
