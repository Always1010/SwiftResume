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
  { id: "newspaper", name: "报刊编辑", description: "双线报头与新闻编辑式信息层级" },
  { id: "swiss", name: "瑞士网格", description: "红黑网格、左对齐与理性秩序" },
  { id: "magazine", name: "杂志封面", description: "超大姓名与时尚编辑版式" },
  { id: "blueprint", name: "建筑蓝图", description: "蓝图格线与工程制图式边框" },
  { id: "japanese", name: "日式留白", description: "克制的不对称布局与细腻留白" },
  { id: "archive", name: "复古档案", description: "暖纸色、编号与档案索引气质" },
  { id: "nordic", name: "北欧清简", description: "冷灰柔色与圆角信息卡片" },
  { id: "bauhaus", name: "包豪斯几何", description: "圆形方块与三原色构成感" },
  { id: "index", name: "标签索引", description: "侧边页签定位每一个内容模块" },
  { id: "monochrome", name: "黑白重构", description: "高反差黑白与粗线条标题" },
  { id: "gradient", name: "流光渐变", description: "轻盈渐变与通透的现代信息区" },
  { id: "terminal", name: "终端档案", description: "深色命令行抬头与提示符章节" },
  { id: "ledger", name: "账本格线", description: "规则横线与表格式信息组织" },
  { id: "diplomat", name: "外交公文", description: "居中徽章感抬头与精细双线" },
  { id: "studio", name: "创意工作室", description: "错位头像与画册式内容卡片" },
  { id: "ribbon", name: "丝带标题", description: "醒目的横向色带串联章节" },
  { id: "capsule", name: "胶囊标签", description: "圆润标签与轻量卡片排版" },
  { id: "split", name: "对半切割", description: "双色切分抬头与斜向视觉动势" },
  { id: "metro", name: "都市导视", description: "站点圆标与线路式阅读路径" },
  { id: "folio", name: "作品集页", description: "大号序章感标题与展陈式布局" },
] as const;

export function getResumeTemplate(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}
