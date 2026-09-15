export type Density = number;

export const MIN_DENSITY = 0;
export const DEFAULT_DENSITY = 50;
export const MAX_DENSITY = 100;

export const RESUME_TEMPLATE_IDS = [
  "classic", "minimal", "executive", "sidebar", "accent", "timeline", "academic", "developer", "compact",
  "newspaper", "swiss", "magazine", "blueprint", "japanese", "archive", "nordic", "bauhaus", "index",
  "monochrome", "gradient", "terminal", "ledger", "diplomat", "studio", "ribbon", "capsule", "split", "metro", "folio",
] as const;
export type ResumeTemplateId = typeof RESUME_TEMPLATE_IDS[number];
export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "classic";
export const DEFAULT_PROFILE_PHOTO = "./sample/fictional-engineer.png";

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
    fontSizePx: interpolateDensity(density, 10.2, 11.5, 12.7),
    sectionSpacePx: interpolateDensity(density, 6, 14, 25),
    entrySpacePx: interpolateDensity(density, 4, 10, 19),
    bodyLine: interpolateDensity(density, 1.22, 1.42, 1.68),
    typstFontSizePt: interpolateDensity(density, 7.7, 8.8, 10),
    typstLeadingEm: interpolateDensity(density, 0.22, 0.42, 0.72),
    typstGapPt: interpolateDensity(density, 2.5, 6, 12),
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
  schemaVersion: 3;
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

function bulletList(items: string[]): RichTextNode {
  return {
    type: "bulletList",
    content: items.map((value) => ({ type: "listItem", content: [paragraph([text(value)])] })),
  };
}

function projectBody(tools: string, description: string, items: string[]): RichTextDocument {
  return {
    type: "doc",
    content: [
      paragraph([text("开发工具：", true), text(tools)]),
      paragraph([text("项目描述：", true), text(description)]),
      paragraph([text("主要内容：", true)]),
      bulletList(items),
    ],
  };
}

function bulletBody(items: string[]): RichTextDocument {
  return {
    type: "doc",
    content: [bulletList(items)],
  };
}

function selfEvaluationBody(): RichTextDocument {
  return {
    type: "doc",
    content: [paragraph([text("具备扎实的后端开发基础和良好的工程实践能力，能够独立完成需求分析、技术设计、功能开发和问题排查。重视代码质量与系统稳定性，面对复杂问题能够主动分析并持续推进解决；具备良好的沟通协作意识，能够与产品、前端和测试人员共同完成项目交付。")])],
  };
}

export function createContentEntry(): ContentEntry {
  return { id: makeId(), title: "", subtitle: "", date: "", body: createEmptyRichText() };
}

export function createDefaultResume(): ResumeDocument {
  return {
    schemaVersion: 3,
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
      photo: DEFAULT_PROFILE_PHOTO,
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
        items: [{ id: makeId(), school: "中国深空技术探索大学", date: "2020.09 – 2024.06", major: "计算机科学与技术", degree: "本科", detail: "GPA 3.7/4.0 · 专业前 15%" }],
      },
      {
        id: makeId(),
        type: "content",
        title: "专业技能",
        enabled: true,
        entries: [{
          id: makeId(), title: "", subtitle: "", date: "", body: bulletBody([
            "熟练掌握 Java，理解集合、并发编程、JVM 内存模型及常见性能调优方法。",
            "熟悉 Spring Boot、Spring MVC、MyBatis、Spring Cloud 等开发框架。",
            "熟悉 MySQL、Redis、RabbitMQ 和 Elasticsearch 等常用数据存储与中间件。",
            "熟悉 Linux、Docker、Git、Maven，能够完成服务部署和线上问题排查。",
            "了解微服务架构、分布式事务、限流降级、缓存一致性和高并发系统设计。",
          ])
        }],
      },
      {
        id: makeId(),
        type: "content",
        title: "工作经历",
        enabled: true,
        entries: [
          {
            id: makeId(), title: "远星云图科技有限公司", subtitle: "后端开发工程师", date: "2024.07 – 至今", body: bulletBody([
              "负责企业协作平台的后端功能开发，参与需求评审、技术设计、编码测试及上线部署。",
              "使用 Spring Boot、MySQL 和 Redis 完成订单、权限和消息通知等核心模块。",
              "优化批量查询和缓存策略，将部分高频接口的平均响应时间由 420ms 降低至 160ms。",
              "参与服务监控与告警体系建设，完善异常日志、链路追踪和线上问题处理流程。",
            ])
          },
          {
            id: makeId(), title: "极光智联软件有限公司", subtitle: "Java 开发实习生", date: "2023.06 – 2023.12", body: bulletBody([
              "参与内部运营管理系统的接口开发，完成客户、合同和数据报表相关功能。",
              "根据产品需求编写接口文档、数据库表结构和单元测试，并协助排查数据异常。",
            ])
          },
        ],
      },
      {
        id: makeId(),
        type: "content",
        title: "项目经历",
        enabled: true,
        entries: [
          {
            id: makeId(), title: "高并发订单处理平台", subtitle: "核心开发", date: "2024.09 – 2025.02", body: projectBody(
              "Java · Spring Boot · MySQL · Redis · RabbitMQ · Docker",
              "面向促销活动场景的订单处理系统，支持库存预扣、订单创建、超时取消和支付状态同步。",
              [
                "使用 Redis 和 Lua 脚本实现库存预扣，避免高并发情况下出现超卖问题。",
                "使用 RabbitMQ 异步处理订单创建和超时关闭，降低核心链路响应时间。",
                "基于唯一业务标识实现接口幂等，并通过压测验证系统稳定性。",
              ],
            )
          },
          {
            id: makeId(), title: "统一日志与监控平台", subtitle: "后端开发", date: "2024.04 – 2024.08", body: projectBody(
              "Spring Boot · Elasticsearch · Kafka · Prometheus · Grafana",
              "集中采集多个业务系统的运行日志和指标，为开发人员提供检索、监控和告警能力。",
              [
                "设计日志采集、清洗、存储和检索流程，统一不同服务的日志字段。",
                "使用 Kafka 对日志写入流量进行削峰，并根据查询场景设计 Elasticsearch 索引。",
                "接入 Prometheus 和 Grafana，展示接口耗时、错误率和服务运行状态。",
              ],
            )
          },
          {
            id: makeId(), title: "校园二手交易平台", subtitle: "项目负责人", date: "2023.10 – 2024.03", body: projectBody(
              "Java · Spring Boot · Vue · MySQL · Redis",
              "面向校园用户的闲置物品交易平台，提供商品发布、分类检索、收藏和订单管理功能。",
              [
                "负责需求分析、后端架构设计和任务拆分，完成用户、商品、订单和评论模块。",
                "使用 Redis 缓存热门商品，并设计缓存失效与数据更新策略。",
                "使用 JWT 实现登录认证和接口访问控制，完成服务器部署与项目演示。",
              ],
            )
          },
        ],
      },
      {
        id: makeId(),
        type: "content",
        title: "个人荣誉",
        enabled: true,
        entries: [{
          id: makeId(), title: "", subtitle: "", date: "", body: bulletBody([
            "获得校级一等奖学金和“三好学生”荣誉称号。",
            "获得大学生程序设计竞赛校级二等奖。",
            "获得 2025 年度“最美软件工程师”荣誉称号。",
            "获得 2026 年度“感动中国十大人物之一”荣誉称号。",
          ])
        }],
      },
      {
        id: makeId(),
        type: "content",
        title: "自我评价",
        enabled: true,
        entries: [{ id: makeId(), title: "", subtitle: "", date: "", body: selfEvaluationBody() }],
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
    sections: [createSection("education"), content("专业技能"), content("工作经历"), content("项目经历"), content("个人荣誉"), content("自我评价")],
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
  return candidate.schemaVersion === 3 && typeof candidate.title === "string" && Boolean(candidate.profile) && Boolean(candidate.theme) && Array.isArray(candidate.sections);
}

export function normalizeResumeDocument(value: unknown): ResumeDocument | null {
  if (!isResumeDocument(value)) return null;
  const resume = structuredClone(value);
  resume.theme.density = normalizeDensity(resume.theme.density);
  resume.theme.templateId = normalizeResumeTemplateId(resume.theme.templateId);
  return resume;
}
