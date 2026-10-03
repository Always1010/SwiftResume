import type { ContentSection, RichTextNode } from "./resume";

export function plainText(node: RichTextNode): string {
  if (node.text !== undefined) return node.text;
  return (node.content ?? []).map(plainText).join(["doc", "bulletList", "orderedList"].includes(node.type ?? "") ? "\n" : "");
}

export function sectionPurpose(section: ContentSection) {
  return section.purpose ?? (/工作|实习/.test(section.title) ? "work" : /项目/.test(section.title) ? "project" : /技能/.test(section.title) ? "skills" : /简介|评价/.test(section.title) ? "summary" : "custom");
}

export function contentLabels(section: ContentSection) {
  const purpose = sectionPurpose(section);
  const guides = {
    work: { title: "公司 / 组织", subtitle: "岗位", add: "添加工作经历" },
    project: { title: "项目名称", subtitle: "承担角色", add: "添加项目经历" },
    skills: { title: "技能类别（选填）", subtitle: "熟练程度（选填）", add: "添加技能条目" },
    summary: { title: "标题（选填）", subtitle: "补充信息（选填）", add: "添加简介" },
    custom: { title: "标题 / 名称（选填）", subtitle: "补充信息（选填）", add: "添加内容条目" },
  };
  return guides[purpose];
}
