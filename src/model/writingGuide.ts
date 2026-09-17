import type { ContentSection, RichTextNode } from "./resume";

export function plainText(node: RichTextNode): string {
  if (node.text !== undefined) return node.text;
  return (node.content ?? []).map(plainText).join(["doc", "bulletList", "orderedList"].includes(node.type ?? "") ? "\n" : "");
}

export function sectionPurpose(section: ContentSection) {
  return section.purpose ?? (/工作|实习/.test(section.title) ? "work" : /项目/.test(section.title) ? "project" : /技能/.test(section.title) ? "skills" : /简介|评价/.test(section.title) ? "summary" : "custom");
}

export function writingGuide(section: ContentSection) {
  const purpose = sectionPurpose(section);
  const guides = {
    work: { title: "公司 / 组织", subtitle: "岗位", add: "添加工作经历", prompt: "负责什么业务？采取了哪些行动？产生了什么可核实的成果？", example: "负责【业务或职责】，通过【具体行动】改善【问题】，取得【可核实的结果】。" },
    project: { title: "项目名称", subtitle: "承担角色", add: "添加项目经历", prompt: "项目解决什么问题？你负责哪部分？采用什么措施？最后有什么结果？", example: "项目目标：【解决的问题】\n我的职责：【负责的部分】\n实施措施：【方法和技术】\n项目成果：【实际结果】" },
    skills: { title: "技能类别（选填）", subtitle: "熟练程度（选填）", add: "添加技能条目", prompt: "列出与目标岗位有关的技能，并用实际使用场景说明，不必堆砌关键词。", example: "掌握【技能】，曾在【场景或项目】中用于【具体任务】。" },
    summary: { title: "标题（选填）", subtitle: "补充信息（选填）", add: "添加简介", prompt: "用两三句话介绍相关经验、可迁移能力和求职方向。", example: "具备【相关经验】，擅长【能力】，希望在【目标岗位】中解决【问题】。" },
    custom: { title: "标题 / 名称（选填）", subtitle: "补充信息（选填）", add: "添加内容条目", prompt: "写清背景、你的行动和结果；标题、补充信息和时间都可以留空。", example: "在【背景】下，完成【具体行动】，取得【实际结果】。" },
  };
  return guides[purpose];
}
