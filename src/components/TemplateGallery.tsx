import { useEffect, useRef, useState, type RefObject } from "react";
import type { ResumeTemplateId } from "../model/resume";
import { RESUME_TEMPLATES, type ResumeTemplateDefinition } from "../templates/registry";

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

export function TemplateGallery({ selectedId, onSelect }: {
  selectedId: ResumeTemplateId;
  onSelect: (templateId: ResumeTemplateId) => void;
}) {
  const railRef = useRef<HTMLElement>(null);
  return (
    <aside ref={railRef} className="standalone-template-gallery" aria-label="简历模板画廊">
      <div className="template-gallery-heading">
        <strong>模板画廊</strong>
        <span>{RESUME_TEMPLATES.length} 套</span>
      </div>
      <div className="template-gallery-list">
        {RESUME_TEMPLATES.map((template) => (
          <button
            type="button"
            className={`template-gallery-card ${selectedId === template.id ? "selected" : ""}`}
            aria-pressed={selectedId === template.id}
            aria-label={`预览${template.name}模板`}
            title={template.description}
            key={template.id}
            onClick={() => onSelect(template.id)}
          >
            <LazyTemplateImage template={template} rootRef={railRef} />
            <span><strong>{template.name}</strong><small>{template.description}</small></span>
          </button>
        ))}
      </div>
    </aside>
  );
}
