import type { ResumeCreationTemplate, ResumeTemplateId, SectionPurpose } from "./resume";

export const SCENARIOS = [
  { id: "graduate", title: "应届生 / 实习", role: "校招前端开发", description: "包含教育、实习、三个项目、技能与校园荣誉。", style: "graduate" },
  { id: "experienced", title: "已有工作经验", role: "前端工程师", description: "用两段工作经历和三个项目展示技术行动与成果。", style: "executive" },
  { id: "career-change", title: "转行求职", role: "运营转产品", description: "从运营经历到产品协作，展示用户研究、需求与交付。", style: "minimal" },
] as const satisfies ReadonlyArray<{ id: ResumeCreationTemplate; title: string; role: string; description: string; style: ResumeTemplateId }>;

export const MODULE_PRESETS: Record<SectionPurpose, { title: string; subtitle: string; date: string; lines: string[]; skeleton: string[]; list?: boolean }> = {
  work: { title: "【示例】远山科技", subtitle: "前端工程师", date: "2023.07 – 2026.06", list: true,
    lines: ["负责商家订单后台的前端开发，与产品、设计和后端共同梳理订单处理流程。", "将重复表单抽成公共组件，补充使用文档，让新增页面复用已有交互。", "通过路由拆分与图片延迟加载改善首屏体验，使用上线前后的性能记录验证效果。"],
    skeleton: ["主要职责：【负责的业务与范围】", "关键行动：【采取的方法与具体工作】", "工作成果：【结果与可核实的依据】"] },
  project: { title: "【示例】校园活动报名平台", subtitle: "前端开发 / 项目负责人", date: "2025.09 – 2026.03",
    lines: ["项目背景：社团通过多个表格收集报名，信息分散且难以核对名额。", "我的职责：梳理报名流程，负责活动列表、报名表单和管理端页面。", "实施行动：使用 Vue 与 TypeScript 实现表单校验，与后端约定重复报名和名额校验规则。", "项目结果：完成从报名到名单导出的流程，通过社团试用收集问题并迭代。"],
    skeleton: ["项目背景：【要解决的问题】", "我的职责：【你负责的部分】", "实施行动：【方法、工具与具体工作】", "项目结果：【产出、效果与验证方式】"] },
  skills: { title: "【示例】前端开发", subtitle: "", date: "", list: true,
    lines: ["JavaScript / TypeScript：能独立完成表单、接口调用和异常状态处理。", "Vue / React：有组件拆分和状态管理实践，能结合业务选择合适的实现方式。", "工程协作：使用 Git 管理代码，通过代码审查和测试保证交付质量。"],
    skeleton: ["【技能名称】：【掌握程度与实际应用场景】", "【技能名称】：【掌握程度与实际应用场景】"] },
  summary: { title: "", subtitle: "", date: "",
    lines: ["【示例】具备用户运营与需求分析经验，曾通过用户访谈梳理业务问题，并与研发协作推动流程优化。希望转向产品岗位，发挥用户理解、跨团队沟通和数据分析能力。"],
    skeleton: ["具备【相关经验】，擅长【核心能力与依据】，希望在【目标岗位】中发挥【相关价值】。"] },
  custom: { title: "", subtitle: "", date: "", lines: ["【示例】参与开源项目文档维护，整理常见安装问题并补充操作说明。"], skeleton: [] },
};
