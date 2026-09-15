import type { ResumeTemplateId } from "../model/resume";

export interface ResumeTemplateDefinition {
  id: ResumeTemplateId;
  name: string;
  description: string;
}

export const RESUME_TEMPLATES: readonly ResumeTemplateDefinition[] = [
  { id: "classic", name: "经典线框", description: "稳重的单栏布局与横线章节标题" },
  { id: "minimal", name: "极简留白", description: "居中抬头、弱分隔与充足留白" },
  { id: "executive", name: "商务蓝顶", description: "强调色顶部信息区与商务排版" },
  { id: "sidebar", name: "现代侧栏", description: "左侧个人信息栏、右侧主体内容" },
  { id: "accent", name: "垂直强调", description: "纵向色条与紧凑章节锚点" },
  { id: "timeline", name: "经历时间轴", description: "条目沿时间轴组织，突出时间脉络" },
  { id: "academic", name: "学术素雅", description: "黑白克制、适合高密度学术内容" },
  { id: "developer", name: "技术简洁", description: "等宽标签与开发者风格细节" },
  { id: "compact", name: "紧凑分栏", description: "信息网格与紧凑卡片式章节" },
] as const;

export function getResumeTemplate(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}
