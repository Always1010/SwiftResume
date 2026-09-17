import { useMemo, useRef, useState } from "react";
import { type ResumeDocument, type ResumeTemplateId } from "../model/resume";
import {
  RESUME_TEMPLATES,
  TEMPLATE_FAMILIES,
  type ResumeTemplateFamily,
} from "../templates/registry";
import type { TemplateRecommendation } from "../templates/recommender";
import { ResumePreview } from "./ResumePreview";
import { TemplateFinder } from "./TemplateFinder";
import { templatePreviewUrl } from "../templates/staticPreviews";

const FAVORITES_KEY = "swift-resume-template-favorites";

function readFavorites() {
  if (typeof window === "undefined") return [] as ResumeTemplateId[];
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is ResumeTemplateId => RESUME_TEMPLATES.some((item) => item.id === id)) : [];
  } catch {
    return [];
  }
}

export function TemplateGallery({ selectedId, resume, onSelect }: {
  selectedId: ResumeTemplateId;
  resume: ResumeDocument;
  onSelect: (templateId: ResumeTemplateId) => void;
}) {
  const railRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"finder" | "browse">("finder");
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([]);
  const [compareIds, setCompareIds] = useState<ResumeTemplateId[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ResumeTemplateFamily | "all" | "favorites">("all");
  const [favorites, setFavorites] = useState<ResumeTemplateId[]>(readFavorites);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const browseTemplates = useMemo(() => RESUME_TEMPLATES.filter((template) => {
    if (family === "favorites" && !favorites.includes(template.id)) return false;
    if (family !== "all" && family !== "favorites" && template.family !== family) return false;
    if (!normalizedQuery) return true;
    return [template.name, template.description, ...template.tags].join(" ").toLocaleLowerCase().includes(normalizedQuery);
  }), [family, favorites, normalizedQuery]);
  const filteredTemplates = mode === "finder" && recommendations.length
    ? recommendations.map((item) => item.template)
    : browseTemplates;
  const recommendationById = new Map(recommendations.map((item) => [item.template.id, item]));

  const toggleFavorite = (templateId: ResumeTemplateId) => {
    setFavorites((current) => {
      const next = current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };
  const toggleCompare = (templateId: ResumeTemplateId) => {
    setCompareIds((current) => current.includes(templateId)
      ? current.filter((id) => id !== templateId)
      : current.length < 4 ? [...current, templateId] : current);
  };

  return (
    <aside ref={railRef} className="standalone-template-gallery" aria-label="简历模板画廊">
      <div className="template-gallery-controls">
        <div className="template-gallery-heading">
          <div><strong>模板中心</strong><small>{mode === "finder" ? "15 秒找到适合你的样式" : `从 ${RESUME_TEMPLATES.length} 套中快速找款`}</small></div>
          <span>{mode === "finder" && !recommendations.length ? "3步" : filteredTemplates.length}</span>
        </div>
        <div className="template-gallery-modes" role="tablist" aria-label="模板查找方式">
          <button type="button" role="tab" aria-selected={mode === "finder"} className={mode === "finder" ? "active" : ""} onClick={() => setMode("finder")}>为我推荐</button>
          <button type="button" role="tab" aria-selected={mode === "browse"} className={mode === "browse" ? "active" : ""} onClick={() => setMode("browse")}>全部模板</button>
        </div>
        {mode === "browse" && <>
          <label className="template-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索行业、风格或布局" aria-label="搜索模板" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="清空模板搜索">×</button>}
          </label>
          <div className="template-family-tabs" role="group" aria-label="模板分类">
            {TEMPLATE_FAMILIES.map((item) => (
              <button key={item.id} type="button" className={family === item.id ? "active" : ""} onClick={() => setFamily(item.id)}>{item.name}</button>
            ))}
            <button type="button" className={family === "favorites" ? "active" : ""} onClick={() => setFamily("favorites")}>★ 收藏</button>
          </div>
        </>}
      </div>
      {mode === "finder" && !recommendations.length ? (
        <TemplateFinder resume={resume} onComplete={(results) => setRecommendations(results)} />
      ) : filteredTemplates.length ? (
        <>
        {mode === "finder" && <div className="template-recommendation-summary"><div><strong>最适合你的 6 套</strong><span>已结合内容量、照片和风格偏好排序</span></div><button type="button" onClick={() => setRecommendations([])}>重新选择</button></div>}
        <div className="template-gallery-list">
          {filteredTemplates.map((template) => {
            const favorite = favorites.includes(template.id);
            const comparing = compareIds.includes(template.id);
            const recommendation = recommendationById.get(template.id);
            return (
              <article className={`template-gallery-card ${selectedId === template.id ? "selected" : ""}`} key={template.id}>
                <button
                  type="button"
                  className="template-gallery-select"
                  aria-pressed={selectedId === template.id}
                  aria-label={`预览${template.name}模板`}
                  title={template.description}
                  onClick={() => onSelect(template.id)}
                >
                  <div className="template-thumbnail-frame"><img src={templatePreviewUrl(template.id)} alt={`${template.name}模板示例首页`} loading="lazy" decoding="async" width={420} height={594} /></div>
                  <span className="template-gallery-copy"><strong>{template.name}</strong><small>{recommendation ? recommendation.reason : template.tags.slice(0, 2).join(" · ")}</small></span>
                </button>
                <button type="button" className={`template-compare-toggle ${comparing ? "active" : ""}`} aria-label={`${comparing ? "移出" : "加入"}${template.name}模板对比`} aria-pressed={comparing} onClick={() => toggleCompare(template.id)}>{comparing ? "✓ 已选" : "＋ 对比"}</button>
                <button type="button" className={`template-favorite ${favorite ? "active" : ""}`} aria-label={`${favorite ? "取消收藏" : "收藏"}${template.name}模板`} aria-pressed={favorite} onClick={() => toggleFavorite(template.id)}>★</button>
              </article>
            );
          })}
        </div>
        </>
      ) : (
        <div className="template-gallery-empty">
          <strong>{family === "favorites" ? "还没有收藏模板" : "没有找到匹配模板"}</strong>
          <span>{family === "favorites" ? "点击模板右上角的星标即可收藏" : "试试更短的关键词或切换分类"}</span>
          {(query || family !== "all") && <button type="button" onClick={() => { setQuery(""); setFamily("all"); }}>查看全部模板</button>}
        </div>
      )}
      {compareIds.length > 0 && <div className="template-compare-tray"><span><strong>{compareIds.length}</strong>/4 套已选</span><button type="button" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>并排对比</button><button type="button" onClick={() => setCompareIds([])} aria-label="清空对比模板">×</button></div>}
      {compareOpen && (
        <div className="template-compare-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCompareOpen(false)}>
          <section className="template-compare-dialog" role="dialog" aria-modal="true" aria-labelledby="template-compare-title">
            <header><div><span>使用你的真实内容</span><h2 id="template-compare-title">并排比较 {compareIds.length} 套模板</h2></div><button type="button" onClick={() => setCompareOpen(false)} aria-label="关闭模板对比">×</button></header>
            <div className={`template-compare-grid count-${compareIds.length}`}>
              {compareIds.map((templateId) => {
                const definition = RESUME_TEMPLATES.find((item) => item.id === templateId)!;
                const previewResume = { ...resume, theme: { ...resume.theme, templateId } };
                return <article className="template-compare-item" key={templateId}>
                  <div className="template-compare-paper"><ResumePreview resume={previewResume} zoom="fit" templateId={templateId} /></div>
                  <footer><div><strong>{definition.name}</strong><span>{definition.description}</span></div><button type="button" onClick={() => { onSelect(templateId); setCompareOpen(false); }}>使用这套</button></footer>
                </article>;
              })}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
