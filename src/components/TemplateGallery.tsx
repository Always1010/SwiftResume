import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ResumeTemplateId } from "../model/resume";
import {
  RESUME_TEMPLATES,
  TEMPLATE_FAMILIES,
  type ResumeTemplateDefinition,
  type ResumeTemplateFamily,
} from "../templates/registry";

const FAVORITES_KEY = "swift-resume-template-favorites";

function LazyTemplateImage({ template, rootRef }: {
  template: ResumeTemplateDefinition;
  rootRef: RefObject<HTMLElement | null>;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { root: rootRef.current, rootMargin: "320px 0px" });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [rootRef, shouldLoad]);

  return (
    <div ref={frameRef} className="template-thumbnail-frame">
      {shouldLoad
        ? <img src={`./template-previews/${template.id}.png`} alt={`${template.name}模板缩略图`} loading="lazy" decoding="async" />
        : <span className="template-thumbnail-placeholder" aria-hidden="true" />}
    </div>
  );
}

function readFavorites() {
  if (typeof window === "undefined") return [] as ResumeTemplateId[];
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is ResumeTemplateId => RESUME_TEMPLATES.some((item) => item.id === id)) : [];
  } catch {
    return [];
  }
}

export function TemplateGallery({ selectedId, onSelect }: {
  selectedId: ResumeTemplateId;
  onSelect: (templateId: ResumeTemplateId) => void;
}) {
  const railRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ResumeTemplateFamily | "all" | "favorites">("all");
  const [favorites, setFavorites] = useState<ResumeTemplateId[]>(readFavorites);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTemplates = useMemo(() => RESUME_TEMPLATES.filter((template) => {
    if (family === "favorites" && !favorites.includes(template.id)) return false;
    if (family !== "all" && family !== "favorites" && template.family !== family) return false;
    if (!normalizedQuery) return true;
    return [template.name, template.description, ...template.tags].join(" ").toLocaleLowerCase().includes(normalizedQuery);
  }), [family, favorites, normalizedQuery]);

  const toggleFavorite = (templateId: ResumeTemplateId) => {
    setFavorites((current) => {
      const next = current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <aside ref={railRef} className="standalone-template-gallery" aria-label="简历模板画廊">
      <div className="template-gallery-controls">
        <div className="template-gallery-heading">
          <div><strong>模板中心</strong><small>从 {RESUME_TEMPLATES.length} 套中快速找款</small></div>
          <span>{filteredTemplates.length}</span>
        </div>
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
      </div>
      {filteredTemplates.length ? (
        <div className="template-gallery-list">
          {filteredTemplates.map((template) => {
            const favorite = favorites.includes(template.id);
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
                  <LazyTemplateImage template={template} rootRef={railRef} />
                  <span className="template-gallery-copy"><strong>{template.name}</strong><small>{template.tags.slice(0, 2).join(" · ")}</small></span>
                </button>
                <button type="button" className={`template-favorite ${favorite ? "active" : ""}`} aria-label={`${favorite ? "取消收藏" : "收藏"}${template.name}模板`} aria-pressed={favorite} onClick={() => toggleFavorite(template.id)}>★</button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="template-gallery-empty">
          <strong>{family === "favorites" ? "还没有收藏模板" : "没有找到匹配模板"}</strong>
          <span>{family === "favorites" ? "点击模板右上角的星标即可收藏" : "试试更短的关键词或切换分类"}</span>
          {(query || family !== "all") && <button type="button" onClick={() => { setQuery(""); setFamily("all"); }}>查看全部模板</button>}
        </div>
      )}
    </aside>
  );
}
