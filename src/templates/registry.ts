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
  renderBase: ResumeTemplateId;
  styleVariant: TemplateStyleVariant;
}

export type ResumeTemplateFamily = "business" | "minimal" | "modern" | "tech" | "academic" | "editorial" | "creative" | "classic" | "campus" | "public";
export type TemplateStyleVariant = "original" | "ink" | "soft" | "sharp" | "airy" | "compact" | "bordered" | "colorblock" | "serif" | "grid" | "round";

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
  { id: "campus", name: "校招实习" },
  { id: "public", name: "公共事业" },
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
  renderBase: ResumeTemplateId = id,
  styleVariant: TemplateStyleVariant = "original",
): ResumeTemplateDefinition {
  return { id, name, description, family, tags, layout, density, photo, ats, renderBase, styleVariant };
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
  template("boardroom", "董事会议", "沉稳色块与清晰的管理履历层级", "business", ["高管", "管理", "沉稳"], "single", "balanced", "recommended", "high", "executive", "ink"),
  template("consultant", "咨询顾问", "利落网格适合项目制与咨询经历", "business", ["咨询", "项目", "理性"], "single", "compact", "supported", "high", "swiss", "soft"),
  template("finance", "金融简报", "数字感线框与克制的金融气质", "business", ["金融", "数据", "正式"], "single", "compact", "optional", "high", "ledger", "sharp"),
  template("corporate", "企业蓝筹", "企业级抬头与规整章节分区", "business", ["企业", "职业", "蓝色"], "single", "balanced", "recommended", "high", "executive", "bordered"),
  template("strategy", "战略画布", "模块化信息卡片突出关键成果", "business", ["战略", "成果", "卡片"], "cards", "compact", "supported", "medium", "compact", "grid"),
  template("banking", "银行公文", "传统双线与审慎的专业排版", "business", ["银行", "财务", "公文"], "single", "balanced", "optional", "high", "diplomat", "ink"),

  template("pure", "纯白呼吸", "几乎无装饰的清晰内容排版", "minimal", ["纯白", "极简", "无照片"], "single", "airy", "optional", "high", "minimal", "airy"),
  template("whitespace", "大幅留白", "宽阔边距让重点内容自然聚焦", "minimal", ["留白", "优雅", "少内容"], "single", "airy", "supported", "high", "japanese", "airy"),
  template("zen", "禅意细线", "安静细线与克制的不对称结构", "minimal", ["禅意", "细线", "克制"], "single", "airy", "optional", "medium", "japanese", "ink"),
  template("linen", "亚麻纸感", "温和纸色与轻盈的阅读节奏", "minimal", ["柔和", "纸感", "温暖"], "single", "balanced", "supported", "medium", "archive", "soft"),
  template("quiet", "静谧灰调", "冷灰层次与安静的现代秩序", "minimal", ["灰调", "安静", "现代"], "cards", "airy", "recommended", "medium", "nordic", "ink"),
  template("contour", "轮廓细框", "细框勾勒信息层级而不喧宾夺主", "minimal", ["细框", "结构", "简洁"], "single", "balanced", "supported", "high", "classic", "bordered"),

  template("urban", "城市脉冲", "鲜明节点与都市节奏感阅读路径", "modern", ["城市", "年轻", "节奏"], "timeline", "balanced", "supported", "medium", "metro", "sharp"),
  template("horizon", "水平视界", "横向色带建立舒展而现代的层次", "modern", ["横向", "现代", "舒展"], "single", "airy", "recommended", "medium", "ribbon", "soft"),
  template("modular", "模块矩阵", "规整卡片快速扫描技能与成果", "modern", ["模块", "卡片", "产品"], "cards", "compact", "supported", "medium", "compact", "round"),
  template("signal", "信号标记", "清晰色标让章节定位更加迅速", "modern", ["信号", "色标", "清晰"], "single", "balanced", "supported", "high", "accent", "colorblock"),

  template("code-grid", "代码网格", "网格背景与等宽细节适合开发岗位", "tech", ["代码", "网格", "开发"], "single", "compact", "supported", "medium", "developer", "grid"),
  template("data-lab", "数据实验室", "数据看板式卡片突出量化成果", "tech", ["数据", "实验室", "量化"], "cards", "compact", "supported", "medium", "blueprint", "round"),
  template("circuit", "电路节点", "工程节点与线路式章节连接", "tech", ["硬件", "电路", "工程"], "timeline", "compact", "supported", "medium", "metro", "grid"),
  template("cloud", "云端架构", "轻量渐变承载现代云计算履历", "tech", ["云计算", "架构", "渐变"], "cards", "balanced", "recommended", "medium", "gradient", "soft"),
  template("system", "系统日志", "日志式条目呈现长期项目积累", "tech", ["系统", "日志", "后端"], "single", "compact", "optional", "high", "terminal", "ink"),
  template("engineer", "工程图纸", "精密边框与制图网格强调工程能力", "tech", ["工程师", "制图", "精密"], "single", "compact", "supported", "medium", "blueprint", "sharp"),
  template("cyber", "赛博终端", "深色终端抬头搭配高亮技术标识", "tech", ["安全", "终端", "深色"], "single", "compact", "supported", "visual", "terminal", "colorblock"),

  template("research", "研究报告", "高密度内容与严谨的研究报告结构", "academic", ["研究", "论文", "高密度"], "single", "compact", "optional", "high", "academic", "compact"),
  template("thesis", "论文答辩", "正式标题与清晰的学术成果分区", "academic", ["论文", "答辩", "成果"], "single", "balanced", "optional", "high", "academic", "bordered"),
  template("scholar", "学者履历", "传统衬线气质适合科研与教学经历", "academic", ["学者", "科研", "衬线"], "single", "compact", "optional", "high", "diplomat", "serif"),
  template("lecture", "讲席教师", "温和层级兼顾教学与课题信息", "academic", ["教师", "课程", "教育"], "single", "balanced", "supported", "high", "classic", "soft"),
  template("laboratory", "实验记录", "实验档案式格线组织课题与论文", "academic", ["实验", "课题", "记录"], "single", "compact", "optional", "medium", "ledger", "grid"),
  template("journal", "期刊目录", "编辑目录感突出发表与研究主题", "academic", ["期刊", "发表", "目录"], "single", "compact", "optional", "medium", "index", "serif"),
  template("citation", "引文索引", "编号式章节适合成果与出版物列表", "academic", ["引文", "出版", "编号"], "single", "compact", "optional", "high", "index", "ink"),
  template("campus-faculty", "学院教职", "学院公文气质与平衡的内容密度", "academic", ["高校", "教职", "正式"], "single", "balanced", "recommended", "high", "diplomat", "bordered"),
  template("doctoral", "博士申请", "克制留白兼顾研究计划与教育背景", "academic", ["博士", "申请", "研究计划"], "single", "balanced", "optional", "high", "minimal", "serif"),

  template("editorial", "编辑手记", "杂志编辑式标题与灵活内容节奏", "editorial", ["编辑", "内容", "杂志"], "single", "balanced", "recommended", "medium", "magazine", "soft"),
  template("broadsheet", "宽幅报章", "报章双线与紧密的文字信息层级", "editorial", ["报纸", "媒体", "文字"], "single", "compact", "optional", "medium", "newspaper", "compact"),
  template("column", "专栏作者", "专栏式层次适合内容与出版履历", "editorial", ["专栏", "作者", "出版"], "single", "balanced", "optional", "medium", "newspaper", "serif"),
  template("headline", "头版标题", "醒目姓名与强烈的头版视觉中心", "editorial", ["头版", "标题", "醒目"], "single", "airy", "recommended", "visual", "magazine", "sharp"),
  template("gazette", "城市公报", "传统报刊秩序与现代城市气息", "editorial", ["公报", "城市", "传统"], "single", "compact", "supported", "medium", "newspaper", "grid"),
  template("typecraft", "字体工坊", "字体层级本身成为主要视觉语言", "editorial", ["字体", "排版", "设计"], "single", "airy", "recommended", "visual", "swiss", "serif"),

  template("canvas", "自由画布", "错位内容块营造创意画册感", "creative", ["画布", "自由", "作品集"], "cards", "airy", "recommended", "visual", "studio", "airy"),
  template("mosaic", "彩色拼贴", "几何色块拼接出活泼的视觉节奏", "creative", ["拼贴", "几何", "彩色"], "cards", "balanced", "recommended", "visual", "bauhaus", "round"),
  template("prism", "棱镜渐彩", "通透渐变与锐利线条结合", "creative", ["棱镜", "渐变", "视觉"], "single", "airy", "recommended", "visual", "gradient", "sharp"),
  template("poster", "海报宣言", "大字标题与强对比构成海报感", "creative", ["海报", "大字", "高反差"], "single", "airy", "recommended", "visual", "monochrome", "colorblock"),
  template("gallery", "展览图录", "策展式留白和编号组织作品经历", "creative", ["展览", "策展", "图录"], "single", "airy", "recommended", "visual", "folio", "bordered"),

  template("heritage", "典藏传承", "精致双线与传统职业气质", "classic", ["典藏", "传统", "正式"], "single", "balanced", "optional", "high", "diplomat", "serif"),
  template("serif", "衬线经典", "衬线字体带来成熟的阅读质感", "classic", ["衬线", "成熟", "经典"], "single", "balanced", "supported", "high", "classic", "serif"),
  template("ivory", "象牙纸页", "柔和底色与低对比细节更耐看", "classic", ["象牙色", "柔和", "文雅"], "single", "airy", "supported", "medium", "archive", "airy"),
  template("gentleman", "绅士名片", "深色抬头搭配克制的经典细节", "classic", ["绅士", "名片", "深色"], "single", "balanced", "recommended", "medium", "executive", "serif"),
  template("manuscript", "手稿边注", "页边索引与纸张质感呈现人文履历", "classic", ["手稿", "人文", "边注"], "single", "compact", "optional", "medium", "archive", "grid"),
  template("seal", "印章公函", "印章色强调与正式公函结构", "classic", ["印章", "公函", "正式"], "single", "balanced", "optional", "high", "diplomat", "colorblock"),
  template("copper", "铜版铭刻", "深棕线条与复古金属气质", "classic", ["铜版", "复古", "深棕"], "single", "compact", "supported", "medium", "ledger", "serif"),
  template("tradition", "传统章法", "熟悉的单栏秩序与稳妥的信息层级", "classic", ["传统", "通用", "稳妥"], "single", "balanced", "supported", "high", "classic", "ink"),

  template("freshman", "新生简历", "清爽层级适合经历较少的在校生", "campus", ["大一", "校园", "清爽"], "single", "airy", "supported", "high", "minimal", "soft"),
  template("graduate", "应届毕业", "规整结构突出教育、项目与技能", "campus", ["应届", "校招", "项目"], "single", "balanced", "recommended", "high", "classic", "colorblock"),
  template("internship", "实习投递", "紧凑卡片帮助有限经历快速成形", "campus", ["实习", "单页", "卡片"], "cards", "compact", "supported", "high", "compact", "soft"),
  template("campus", "校园青春", "轻快配色与友好的圆角信息块", "campus", ["校园", "青春", "圆角"], "cards", "airy", "recommended", "medium", "capsule", "soft"),
  template("youth", "青年计划", "活力色带串联成长与实践经历", "campus", ["青年", "活动", "成长"], "single", "balanced", "recommended", "medium", "ribbon", "round"),
  template("starter", "职场起点", "经典结构降低第一次制作简历的门槛", "campus", ["第一份", "通用", "简单"], "single", "balanced", "supported", "high", "classic", "soft"),
  template("bright", "明亮前程", "明亮渐变营造积极的第一印象", "campus", ["明亮", "年轻", "渐变"], "cards", "airy", "recommended", "medium", "gradient", "round"),
  template("club", "社团实践", "时间轴突出活动、职责和成长轨迹", "campus", ["社团", "实践", "时间轴"], "timeline", "balanced", "supported", "medium", "timeline", "soft"),
  template("scholarship", "奖学金申请", "正式而不沉重的申请材料版式", "campus", ["奖学金", "申请", "荣誉"], "single", "balanced", "optional", "high", "academic", "soft"),
  template("first-job", "第一份工作", "清晰标签帮助招聘者迅速定位亮点", "campus", ["首份工作", "亮点", "校招"], "single", "compact", "supported", "high", "index", "round"),

  template("civil-service", "公务招录", "严谨黑白结构适合公务岗位材料", "public", ["公务员", "招录", "黑白"], "single", "compact", "optional", "high", "academic", "ink"),
  template("institution", "事业单位", "规范抬头与平衡的公共机构气质", "public", ["事业单位", "机构", "规范"], "single", "balanced", "supported", "high", "diplomat", "soft"),
  template("legal", "法律文书", "条理分明的文书式专业排版", "public", ["法律", "律师", "文书"], "single", "compact", "optional", "high", "ledger", "bordered"),
  template("medical", "医疗履历", "洁净卡片呈现资质、科室与经历", "public", ["医疗", "医生", "资质"], "cards", "compact", "recommended", "high", "nordic", "bordered"),
  template("teacher", "教师招聘", "温和严谨地组织教学与获奖经历", "public", ["教师", "招聘", "教学"], "single", "balanced", "recommended", "high", "classic", "serif"),
  template("public-sector", "公共服务", "清晰色标强化职责与服务成果", "public", ["公共服务", "职责", "成果"], "single", "balanced", "supported", "high", "accent", "soft"),
  template("policy", "政策研究", "高密度索引适合课题与政策成果", "public", ["政策", "研究", "课题"], "single", "compact", "optional", "high", "index", "bordered"),
  template("formal", "正式申报", "申报材料式双线结构稳重端正", "public", ["申报", "正式", "端正"], "single", "balanced", "optional", "high", "diplomat", "sharp"),
  template("administration", "行政事务", "标准信息网格便于快速核对经历", "public", ["行政", "事务", "网格"], "single", "compact", "supported", "high", "compact", "bordered"),
  template("state-owned", "国企应聘", "商务色块兼顾规范与职业感", "public", ["国企", "应聘", "商务"], "single", "balanced", "recommended", "high", "executive", "sharp"),
] as const;

export function getResumeTemplate(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}
