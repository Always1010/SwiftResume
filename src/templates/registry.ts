import type { ResumeTemplateId } from "../model/resume";

export interface ResumeTemplateDefinition {
  id: ResumeTemplateId;
  name: string;
  description: string;
  family: ResumeTemplateFamily;
  tags: readonly string[];
  layout: "single" | "sidebar" | "timeline" | "split" | "cards";
  density: "airy" | "balanced" | "compact";
  photo: "recommended" | "supported" | "optional";
  ats: "high" | "medium" | "visual";
}

export type ResumeTemplateFamily = "business" | "minimal" | "modern" | "tech" | "academic" | "editorial" | "creative" | "classic";

export const TEMPLATE_FAMILIES: readonly { id: ResumeTemplateFamily | "all"; name: string }[] = [
  { id: "all", name: "全部" },
  { id: "business", name: "商务管理" },
  { id: "minimal", name: "现代极简" },
  { id: "modern", name: "都市现代" },
  { id: "tech", name: "技术工程" },
  { id: "academic", name: "学术教育" },
  { id: "editorial", name: "杂志编辑" },
  { id: "creative", name: "创意设计" },
  { id: "classic", name: "经典文化" },
] as const;

function template(
  id: ResumeTemplateId,
  name: string,
  description: string,
  family: ResumeTemplateFamily,
  tags: readonly string[],
  layout: ResumeTemplateDefinition["layout"] = "single",
  density: ResumeTemplateDefinition["density"] = "balanced",
  photo: ResumeTemplateDefinition["photo"] = "optional",
  ats: ResumeTemplateDefinition["ats"] = "high",
): ResumeTemplateDefinition {
  return { id, name, description, family, tags, layout, density, photo, ats };
}

export const RESUME_TEMPLATES: readonly ResumeTemplateDefinition[] = [
  template("classic", "经典线框", "稳重的单栏布局与横线章节标题", "classic", ["正式", "通用", "校招"], "single", "balanced", "supported"),
  template("minimal", "极简留白", "居中抬头、弱分隔与充足留白", "minimal", ["极简", "留白", "优雅"], "single", "airy", "optional"),
  template("executive", "商务蓝顶", "强调色顶部信息区与商务排版", "business", ["管理", "金融", "正式"], "single", "balanced", "recommended"),
  template("sidebar", "现代侧栏", "左侧个人信息栏、右侧主体内容", "modern", ["双栏", "信息丰富", "照片"], "sidebar", "compact", "recommended", "medium"),
  template("accent", "垂直强调", "纵向色条与紧凑章节锚点", "modern", ["简洁", "强调色", "通用"], "single", "balanced", "supported"),
  template("timeline", "经历时间轴", "条目沿时间轴组织，突出时间脉络", "modern", ["时间轴", "工作经历", "成长路径"], "timeline", "balanced", "supported", "medium"),
  template("academic", "学术素雅", "黑白克制、适合高密度学术内容", "academic", ["论文", "教育", "高密度"], "single", "compact", "optional"),
  template("developer", "技术简洁", "等宽标签与开发者风格细节", "tech", ["程序员", "工程师", "等宽"], "single", "balanced", "supported"),
  template("compact", "紧凑分栏", "信息网格与紧凑卡片式章节", "business", ["内容多", "单页", "高密度"], "cards", "compact", "supported"),
  template("newspaper", "报刊编辑", "双线报头与新闻编辑式信息层级", "editorial", ["媒体", "文字", "复古"], "single", "compact", "optional", "medium"),
  template("swiss", "瑞士网格", "红黑网格、左对齐与理性秩序", "editorial", ["网格", "理性", "设计"], "single", "balanced", "supported", "medium"),
  template("magazine", "杂志封面", "超大姓名与时尚编辑版式", "editorial", ["时尚", "品牌", "大标题"], "single", "airy", "recommended", "visual"),
  template("blueprint", "建筑蓝图", "蓝图格线与工程制图式边框", "tech", ["建筑", "工程", "制图"], "single", "balanced", "supported", "medium"),
  template("japanese", "日式留白", "克制的不对称布局与细腻留白", "minimal", ["日式", "安静", "留白"], "single", "airy", "recommended", "medium"),
  template("archive", "复古档案", "暖纸色、编号与档案索引气质", "classic", ["复古", "人文", "暖色"], "single", "balanced", "supported", "medium"),
  template("nordic", "北欧清简", "冷灰柔色与圆角信息卡片", "minimal", ["北欧", "柔和", "卡片"], "cards", "airy", "recommended", "medium"),
  template("bauhaus", "包豪斯几何", "圆形方块与三原色构成感", "creative", ["几何", "设计", "彩色"], "single", "balanced", "recommended", "visual"),
  template("index", "标签索引", "侧边页签定位每一个内容模块", "editorial", ["索引", "栏目", "信息设计"], "single", "compact", "supported", "medium"),
  template("monochrome", "黑白重构", "高反差黑白与粗线条标题", "creative", ["黑白", "高反差", "平面设计"], "single", "balanced", "recommended", "visual"),
  template("gradient", "流光渐变", "轻盈渐变与通透的现代信息区", "modern", ["渐变", "互联网", "年轻"], "cards", "airy", "recommended", "medium"),
  template("terminal", "终端档案", "深色命令行抬头与提示符章节", "tech", ["程序员", "终端", "深色"], "single", "compact", "supported", "medium"),
  template("ledger", "账本格线", "规则横线与表格式信息组织", "business", ["财务", "审计", "严谨"], "single", "compact", "optional"),
  template("diplomat", "外交公文", "居中徽章感抬头与精细双线", "business", ["公职", "法务", "正式"], "single", "balanced", "optional"),
  template("studio", "创意工作室", "错位头像与画册式内容卡片", "creative", ["工作室", "设计师", "作品集"], "cards", "airy", "recommended", "visual"),
  template("ribbon", "丝带标题", "醒目的横向色带串联章节", "modern", ["色带", "清晰", "活力"], "single", "balanced", "supported", "medium"),
  template("capsule", "胶囊标签", "圆润标签与轻量卡片排版", "minimal", ["圆润", "产品", "友好"], "cards", "airy", "recommended", "medium"),
  template("split", "对半切割", "双色切分抬头与斜向视觉动势", "creative", ["分割", "动势", "品牌"], "split", "balanced", "recommended", "visual"),
  template("metro", "都市导视", "站点圆标与线路式阅读路径", "modern", ["导视", "城市", "路径"], "timeline", "balanced", "supported", "medium"),
  template("folio", "作品集页", "大号序章感标题与展陈式布局", "creative", ["作品集", "策展", "留白"], "single", "airy", "recommended", "visual"),
] as const;

export function getResumeTemplate(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}
