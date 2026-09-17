import { MODULE_PRESETS, SCENARIOS } from "./contentPresets";

export type Density = number;

export const MIN_DENSITY = 0;
export const DEFAULT_DENSITY = 50;
export const MAX_DENSITY = 100;

export const RESUME_TEMPLATE_IDS = [
  "classic", "minimal", "executive", "sidebar", "accent", "timeline", "academic", "developer", "compact",
  "newspaper", "swiss", "magazine", "blueprint", "japanese", "archive", "nordic", "bauhaus", "index",
  "monochrome", "gradient", "terminal", "ledger", "diplomat", "studio", "ribbon", "capsule", "split", "metro", "folio",
  "boardroom", "consultant", "finance", "corporate", "strategy", "banking",
  "pure", "whitespace", "zen", "linen", "quiet", "contour",
  "urban", "horizon", "modular", "signal",
  "code-grid", "data-lab", "circuit", "cloud", "system", "engineer", "cyber",
  "research", "thesis", "scholar", "lecture", "laboratory", "journal", "citation", "campus-faculty", "doctoral",
  "editorial", "broadsheet", "column", "headline", "gazette", "typecraft",
  "canvas", "mosaic", "prism", "poster", "gallery",
  "heritage", "serif", "ivory", "gentleman", "manuscript", "seal", "copper", "tradition",
  "freshman", "graduate", "internship", "campus", "youth", "starter", "bright", "club", "scholarship", "first-job",
  "civil-service", "institution", "legal", "medical", "teacher", "public-sector", "policy", "formal", "administration", "state-owned",
] as const;
export type ResumeTemplateId = typeof RESUME_TEMPLATE_IDS[number];
export type ResumeCreationTemplate = "default" | "blank" | "graduate" | "experienced" | "career-change";
export type SectionPurpose = "work" | "project" | "skills" | "summary" | "custom";
export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "classic";
export const DEFAULT_PROFILE_PHOTO = "./sample/fictional-engineer.png";
export const DEFAULT_PHOTO_BACKGROUND = "transparent";

export interface ProfilePhotoCrop {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_PROFILE_PHOTO_CROP: ProfilePhotoCrop = { zoom: 1, offsetX: 0, offsetY: 0 };

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
  photoSource: string;
  photoBackground: string;
  photoCrop: ProfilePhotoCrop;
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
  purpose?: SectionPurpose;
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
  target?: { company: string; role: string; notes: string };
  lastExport?: { at: string; filename: string; snapshot: Omit<ResumeDocument, "lastExport"> };
}

export type ResumeAction =
  | { type: "replace"; value: ResumeDocument }
  | { type: "update-title"; value: string }
  | { type: "update-profile"; value: ResumeProfile }
  | { type: "update-theme"; value: Partial<ResumeDocument["theme"]> }
  | { type: "update-target"; value: NonNullable<ResumeDocument["target"]> }
  | { type: "record-export"; value: NonNullable<ResumeDocument["lastExport"]> }
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
      paragraph([text("主要工作：", true)]),
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
    content: [paragraph([text("具备扎实的后端开发基础和良好的工程实践能力，能够独立完成需求分析、技术设计、功能开发、问题排查和会议纪要阅读。重视代码质量与系统稳定性，提交代码前通常会认真检查，提交代码后会更加认真地检查。面对复杂问题能够主动分析并持续推进解决，在确实无法解决时也能准确找到最了解该问题的同事。具备良好的沟通协作意识，能够与产品、前端和测试人员友好交流，并在需求发生第六次变化后继续保持基本礼貌。")])],
  };
}

export function createContentEntry(): ContentEntry {
  return { id: makeId(), title: "", subtitle: "", date: "", body: createEmptyRichText() };
}

export function createDefaultResume(): ResumeDocument {
  return {
    schemaVersion: 3,
    title: "搞笑反差示例简历",
    updatedAt: new Date().toISOString(),
    theme: { accent: "#596d82", density: DEFAULT_DENSITY, templateId: DEFAULT_RESUME_TEMPLATE },
    profile: {
      name: "林同学（BACKEND-007）",
      headline: "后端开发工程师｜擅长把线上事故解释成预期之外的压力测试",
      ageGender: "24岁 · 男",
      location: "现居：X省",
      phone: "138 0000 0000",
      email: "backend007@example.com",
      photo: DEFAULT_PROFILE_PHOTO,
      photoSource: DEFAULT_PROFILE_PHOTO,
      photoBackground: DEFAULT_PHOTO_BACKGROUND,
      photoCrop: { ...DEFAULT_PROFILE_PHOTO_CROP },
      details: [
        { id: makeId(), label: "学历", value: "本科" },
        { id: makeId(), label: "求职状态", value: "在职，服务器允许的话可以随时到岗" },
      ],
    },
    sections: [
      {
        id: makeId(),
        type: "education",
        title: "教育背景",
        enabled: true,
        items: [{ id: makeId(), school: "X省理工学院", date: "2020.09 – 2024.06", major: "计算机科学与技术", degree: "本科", detail: "GPA 3.7/4.0，专业前 15%；主修数据结构、操作系统、计算机网络、数据库原理，以及《如何在截止日期前假装一切尽在掌握》" }],
      },
      {
        id: makeId(),
        type: "content",
        title: "专业技能",
        enabled: true,
        entries: [{
          id: makeId(), title: "", subtitle: "", date: "", body: bulletBody([
            "熟练掌握 Java，理解集合、并发编程、JVM 内存模型及常见性能调优方法。",
            "熟悉 Spring Boot、Spring MVC、MyBatis、Spring Cloud，能够熟练创建项目并解决创建项目后出现的问题。",
            "熟悉 MySQL，掌握数据库设计、索引优化、慢查询分析，以及在执行没有条件的更新语句之前反复确认三次。",
            "熟悉 Redis，能够处理缓存穿透、缓存击穿和同事突然把缓存全部清空。",
            "熟悉 RabbitMQ、Elasticsearch 等中间件，知道消息可能丢、可能重复，也可能只是测试人员没刷新页面。",
            "熟悉 Linux、Docker、Git、Maven，能够在服务器上使用命令行表现出经验丰富的样子。",
            "了解微服务、分布式事务、限流降级和高并发系统设计，也了解服务拆得太多之后没人知道请求去了哪里。",
            "具备良好的数据结构与算法基础，能够在业务代码中熟练使用 HashMap，并努力寻找使用其他数据结构的机会。",
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
            id: makeId(), title: "银河系第三旋臂深空技术探索有限公司", subtitle: "后端开发工程师", date: "2024.07 – 至今", body: bulletBody([
              "负责星际协作平台的后端开发与日常维护，保证地球端、月球端和产品经理端的数据基本一致。",
              "使用 Spring Boot、MySQL 和 Redis 完成航线订单、空间站权限及跨行星消息通知模块。",
              "优化批量查询与缓存策略，将高频接口平均响应时间由 12 秒降低至 180ms，用户终于不再以为系统正在思考人生。",
              "设计服务监控和告警体系，使开发人员能够在用户发现故障前 3 秒收到告警。",
              "参与线上问题排查，曾用一下午确认某个严重故障的根本原因是网线没有插紧。",
              "编写接口文档和技术方案，确保半年后的自己至少有 20% 的概率看懂当时的设计。",
            ])
          },
          {
            id: makeId(), title: "海平面以下数据存储技术探索有限公司", subtitle: "Java 开发实习生", date: "2023.06 – 2023.12", body: bulletBody([
              "参与深海数据管理系统开发，负责客户、合同、海底机房和防水键盘相关接口。",
              "设计数据备份策略，将重要数据同时保存三份，其中两份用于备份，另一份用于备份前两份。",
              "协助排查数据异常，最终发现测试环境、预发布环境和生产环境使用了三个完全不同的数据库。",
              "整理历史代码，将一个 2,800 行的方法拆分成 38 个暂时没人敢修改的小方法。",
              "编写日常运维工具，把需要两小时的人工操作缩短为五分钟，以及十五分钟的操作确认。",
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
            id: makeId(), title: "银河级高并发陨石订单处理平台", subtitle: "核心开发", date: "2024.09 – 2025.02", body: projectBody(
              "Java · Spring Boot · MySQL · Redis · RabbitMQ · Docker",
              "面向星际矿产促销活动的订单系统，支持陨石查询、库存预扣、订单创建、超时取消和跨星球支付状态同步。",
              [
                "使用 Redis 和 Lua 脚本实现库存预扣，避免同一颗陨石同时出售给八个星球。",
                "使用 RabbitMQ 异步处理订单创建和超时关闭，让用户在等待结果时至少可以看到一个转圈动画。",
                "基于唯一业务标识实现接口幂等，避免通信延迟导致用户收到十七颗重复陨石。",
                "对订单表进行索引优化和冷热数据拆分，其中真正发热的数据被转移至恒温机房。",
                "使用 Docker 完成本地服务编排，并通过模拟银河购物节验证系统稳定性。",
                "压测期间系统成功承受每秒十万次请求，开发人员只承受了每秒三次心理冲击。",
              ],
            )
          },
          {
            id: makeId(), title: "全宇宙统一日志与责任追踪平台", subtitle: "后端开发", date: "2024.04 – 2024.08", body: projectBody(
              "Spring Boot · Elasticsearch · Kafka · Prometheus · Grafana",
              "集中采集不同星球业务系统的日志和运行指标，为开发人员提供检索、监控、告警以及快速证明这个问题不是我引起的能力。",
              [
                "统一不同服务的日志字段，解决每个开发人员都认为自己命名最合理的问题。",
                "使用 Kafka 对日志流量进行削峰，避免大量错误日志把日志平台本身打出错误日志。",
                "根据服务名称、日志级别和时间范围设计 Elasticsearch 索引。",
                "接入 Prometheus 和 Grafana，展示接口耗时、错误率、服务状态及开发人员血压趋势。",
                "配置分级告警规则：普通问题发送消息，严重问题拨打电话，特别严重的问题自动播放起床铃声。",
                "将平均故障定位时间从两小时缩短至十分钟，其中八分钟用于确认是否可以重启服务。",
              ],
            )
          },
          {
            id: makeId(), title: "X省校园闲置火箭零件交易平台", subtitle: "项目负责人", date: "2023.10 – 2024.03", body: projectBody(
              "Java · Spring Boot · Vue · MySQL · Redis",
              "为校园用户提供闲置火箭零件、实验器材和未使用课程教材的发布、检索、收藏及订单管理功能。",
              [
                "负责需求分析、后端架构设计和任务拆分，同时负责提醒组员查看任务。",
                "完成用户认证、商品发布、收藏、订单、评论和火箭发动机禁止包邮模块。",
                "使用 Redis 缓存热门商品，避免同一枚二手螺丝被连续查询十万次。",
                "使用 JWT 实现登录认证和接口访问控制。",
                "编写部署文档并完成服务器部署，证明项目不仅可以在组长的电脑上运行。",
                "答辩当天成功运行全部核心功能，仅有天气组件显示火星沙尘暴预警。",
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
            "获得 X省理工学院一等奖学金及“服务器关机前最后离开机房的学生”荣誉称号。",
            "获得校级程序设计竞赛二等奖，一等奖因数组下标从 1 开始而遗憾错失。",
            "连续三年保持个人电脑桌面文件数量不超过 400 个。",
            "参与开源项目维护，累计提交多个功能优化，以及两个由自己引入后又亲自修复的问题。",
            "获得 2025 年度“最能让服务稳定运行的软件工程师”称号。",
            "入选 2026 年度“银河系十大感动中间件人物”候选名单。",
            "曾在没有重启服务的情况下成功解决线上故障，相关事迹至今仍在部门内部流传。",
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
    profile: {
      name: "", headline: "", ageGender: "", location: "", phone: "", email: "", photo: "",
      photoSource: "", photoBackground: DEFAULT_PHOTO_BACKGROUND, photoCrop: { ...DEFAULT_PROFILE_PHOTO_CROP }, details: [],
    },
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createResumeFromTemplate(template: ResumeCreationTemplate, withExamples = true): ResumeDocument {
  if (template === "default") return createDefaultResume();
  const resume = createBlankResume();
  if (template === "blank") return resume;
  const starters = {
    graduate: { title: "应届生简历", modules: ["education", "project", "work", "skills"] },
    experienced: { title: "工作经验简历", modules: ["work", "project", "skills", "education"] },
    "career-change": { title: "转行求职简历", modules: ["summary", "skills", "project", "work", "education"] },
  } as const;
  const starter = starters[template];
  resume.title = starter.title;
  const scene = SCENARIOS.find((item) => item.id === template)!;
  resume.theme = { ...resume.theme, templateId: scene.style, accent: template === "experienced" ? "#26466b" : "#247352" };
  resume.sections = starter.modules.map((purpose) => createQuickSection(purpose, withExamples ? "example" : "blank"));
  if (withExamples) {
    resume.profile = { ...resume.profile, name: "【示例】林晨", headline: scene.role, location: "杭州", phone: "【填写你的手机】", email: "linchen@example.com" };
    if (template === "graduate") {
      const work = resume.sections.find((s) => s.type === "content" && s.purpose === "work") as ContentSection;
      work.title = "实习经历";
      work.entries[0] = { ...work.entries[0], subtitle: "前端开发实习生", date: "2025.07 – 2025.09", body: presetBody(["协助开发活动管理页面，完成列表筛选、表单校验与接口联调。", "整理测试反馈，复现并修复边界状态问题，参与上线前的回归验证。"], true) };
    } else if (template === "experienced") {
      const education = resume.sections.find((s) => s.type === "education") as EducationSection;
      education.items[0].date = "2019.09 – 2023.06";
      const project = resume.sections.find((s) => s.type === "content" && s.purpose === "project") as ContentSection;
      project.entries[0] = { ...project.entries[0], title: "【示例】商家订单工作台", subtitle: "前端负责人", date: "2024.03 – 2025.12", body: presetBody(["项目背景：商家处理订单需要在多个页面间切换，异常订单缺乏集中入口。", "我的职责：负责前端方案设计、任务拆分和核心页面交付。", "实施行动：统一订单状态与筛选规则，封装列表和表单组件，补充核心流程测试。", "项目结果：交付统一工作台，与业务方复盘处理流程，并持续跟踪异常订单反馈。"])};
    } else {
      const work = resume.sections.find((s) => s.type === "content" && s.purpose === "work") as ContentSection;
      work.entries[0] = { ...work.entries[0], subtitle: "用户运营", body: presetBody(["负责用户反馈整理与活动运营，将零散反馈归类为业务场景和需求问题。", "访谈一线同事与用户，梳理需求优先级，与产品和研发协作改进报名流程。", "建立活动复盘记录，通过参与、转化和反馈数据提出下一轮改进建议。"], true) };
      const skills = resume.sections.find((s) => s.type === "content" && s.purpose === "skills") as ContentSection;
      skills.entries[0] = { ...skills.entries[0], title: "【示例】可迁移能力", body: presetBody(["需求分析：通过访谈与反馈归类识别用户问题，整理需求清单与业务流程。", "数据分析：使用 Excel 整理活动数据，对比不同渠道和用户阶段的表现。", "协作交付：能撰写流程说明、绘制原型，并与研发沟通验收标准。"], true) };
      const project = resume.sections.find((s) => s.type === "content" && s.purpose === "project") as ContentSection;
      project.entries[0] = { ...project.entries[0], title: "【示例】活动报名流程优化", subtitle: "需求分析与原型设计", date: "2025.09 – 2026.03", body: presetBody(["项目背景：用户频繁询问报名进度，运营人员需要逐条查询与回复。", "我的职责：整理用户反馈，绘制现状流程并确定报名状态查询需求。", "实施行动：设计状态查询原型，编写异常场景和验收清单，与研发评估方案。", "项目结果：形成完整需求文档与可交互原型，通过内部走查完善提示与异常流程。"])};
    }
  }
  return resume;
}

export function presetBody(lines: string[], list = false): RichTextDocument {
  const paragraphs = lines.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }));
  return { type: "doc", content: list ? [{ type: "bulletList", content: paragraphs.map((p) => ({ type: "listItem", content: [p] })) }] : paragraphs.length ? paragraphs : [{ type: "paragraph" }] };
}

export function createPurposeEntry(purpose: SectionPurpose, mode: "example" | "skeleton" | "blank" = "skeleton"): ContentEntry {
  const preset = MODULE_PRESETS[purpose];
  return { ...createContentEntry(), ...(mode === "example" ? { title: preset.title, subtitle: preset.subtitle, date: preset.date } : {}), body: presetBody(mode === "example" ? preset.lines : mode === "skeleton" ? preset.skeleton : [], preset.list) };
}

export function createQuickSection(purpose: SectionPurpose | "education", mode: "example" | "skeleton" | "blank" = "skeleton"): ResumeSection {
  if (purpose === "education") {
    const section = createSection("education") as EducationSection;
    if (mode === "example") section.items[0] = { ...section.items[0], school: "【示例】江南理工大学", major: "计算机科学与技术", degree: "本科", date: "2022.09 – 2026.06", detail: "主修数据结构、数据库与软件工程；在课程实践中完成需求分析、开发与项目答辩。" };
    return section;
  }
  return { ...createSection("content"), type: "content", entries: [createPurposeEntry(purpose, mode)], purpose,
    title: { work: "工作经历", project: "项目经历", skills: "专业技能", summary: "个人简介", custom: "自定义模块" }[purpose] };
}

export function clearResumeContent(source: ResumeDocument): ResumeDocument {
  const blank = createBlankResume();
  return { ...source, profile: blank.profile, lastExport: undefined, updatedAt: new Date().toISOString(), sections: source.sections.map((section) => {
    const empty = createQuickSection(section.type === "education" ? "education" : section.purpose ?? "custom", "blank");
    return { ...empty, id: section.id, title: section.title, enabled: section.enabled };
  }) };
}

export function duplicateResume(resume: ResumeDocument): ResumeDocument {
  const copy = structuredClone(resume);
  delete copy.lastExport;
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
    case "update-target": return { ...state, target: action.value, updatedAt };
    case "record-export": return { ...state, lastExport: action.value, updatedAt };
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
  const legacyProfile = resume.profile as ResumeProfile & {
    photoSource?: unknown;
    photoBackground?: unknown;
    photoCrop?: Partial<ProfilePhotoCrop>;
  };
  resume.profile.photoSource = typeof legacyProfile.photoSource === "string" ? legacyProfile.photoSource : resume.profile.photo;
  resume.profile.photoBackground = typeof legacyProfile.photoBackground === "string"
    && (legacyProfile.photoBackground === DEFAULT_PHOTO_BACKGROUND || /^#[0-9a-f]{6}$/i.test(legacyProfile.photoBackground))
    ? legacyProfile.photoBackground
    : DEFAULT_PHOTO_BACKGROUND;
  const zoom = Number(legacyProfile.photoCrop?.zoom);
  const offsetX = Number(legacyProfile.photoCrop?.offsetX);
  const offsetY = Number(legacyProfile.photoCrop?.offsetY);
  resume.profile.photoCrop = {
    zoom: Number.isFinite(zoom) ? Math.min(3, Math.max(1, zoom)) : DEFAULT_PROFILE_PHOTO_CROP.zoom,
    offsetX: Number.isFinite(offsetX) ? Math.min(100, Math.max(-100, offsetX)) : DEFAULT_PROFILE_PHOTO_CROP.offsetX,
    offsetY: Number.isFinite(offsetY) ? Math.min(100, Math.max(-100, offsetY)) : DEFAULT_PROFILE_PHOTO_CROP.offsetY,
  };
  resume.theme.density = normalizeDensity(resume.theme.density);
  resume.theme.templateId = normalizeResumeTemplateId(resume.theme.templateId);
  return resume;
}
