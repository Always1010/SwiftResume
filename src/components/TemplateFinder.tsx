import { useState } from "react";
import type { ResumeDocument } from "../model/resume";
import {
  recommendTemplates,
  type CareerScene,
  type LayoutPreference,
  type TemplatePreferences,
  type TemplateRecommendation,
  type VisualTone,
} from "../templates/recommender";

const SCENES: readonly { value: CareerScene; label: string; detail: string }[] = [
  { value: "business", label: "商务管理", detail: "管理、金融、咨询、法务" },
  { value: "tech", label: "技术研发", detail: "开发、工程、数据、产品" },
  { value: "academic", label: "学术教育", detail: "科研、教师、深造申请" },
  { value: "creative", label: "设计创意", detail: "设计、媒体、品牌、内容" },
  { value: "general", label: "通用求职", detail: "校招、运营、行政、综合岗位" },
] as const;

const TONES: readonly { value: VisualTone; label: string; detail: string }[] = [
  { value: "restrained", label: "稳重克制", detail: "正式、耐看、少装饰" },
  { value: "modern", label: "现代清晰", detail: "利落、友好、有秩序" },
  { value: "expressive", label: "个性鲜明", detail: "大胆、醒目、有设计感" },
] as const;

const LAYOUTS: readonly { value: LayoutPreference; label: string; detail: string }[] = [
  { value: "single", label: "经典单栏", detail: "阅读顺序直接，机器筛选友好" },
  { value: "sidebar", label: "现代侧栏", detail: "个人信息醒目，空间利用充分" },
  { value: "structured", label: "卡片或时间轴", detail: "信息层次丰富，经历路径清楚" },
] as const;

export function TemplateFinder({ resume, onComplete }: {
  resume: ResumeDocument;
  onComplete: (results: TemplateRecommendation[], preferences: TemplatePreferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Partial<TemplatePreferences>>({});
  const questions = [
    { title: "你准备投递什么方向？", hint: "先确定使用场景", options: SCENES },
    { title: "你希望给人什么感觉？", hint: "凭第一感觉选择", options: TONES },
    { title: "你更喜欢哪种信息结构？", hint: "系统还会结合你的内容量", options: LAYOUTS },
  ] as const;
  const question = questions[step];

  const choose = (value: CareerScene | VisualTone | LayoutPreference) => {
    const key = (["scene", "tone", "layout"] as const)[step];
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    const complete = next as TemplatePreferences;
    onComplete(recommendTemplates(resume, complete), complete);
  };

  return (
    <section className="template-finder" aria-labelledby="template-finder-title">
      <div className="template-finder-progress"><span style={{ width: `${(step + 1) / questions.length * 100}%` }} /></div>
      <div className="template-finder-heading">
        <span>第 {step + 1} 步，共 {questions.length} 步</span>
        <h2 id="template-finder-title">{question.title}</h2>
        <p>{question.hint}</p>
      </div>
      <div className="template-finder-options">
        {question.options.map((option) => (
          <button key={option.value} type="button" onClick={() => choose(option.value)}>
            <strong>{option.label}</strong><span>{option.detail}</span><b aria-hidden="true">→</b>
          </button>
        ))}
      </div>
      {step > 0 && <button type="button" className="template-finder-back" onClick={() => setStep(step - 1)}>← 返回上一步</button>}
    </section>
  );
}
