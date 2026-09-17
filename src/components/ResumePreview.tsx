import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getDensityLayout } from "../model/resume";
import type { ContentEntry, ResumeDocument, ResumeSection, ResumeTemplateId } from "../model/resume";
import { getResumeTemplate } from "../templates/registry";
import { renderContentRichText } from "../model/contentRichText";
import { paginatePreviewItems } from "../preview/pagination";

function SectionHeading({ children }: { children: string }) {
  return <div className="resume-section-heading"><h2>{children}</h2><span /></div>;
}

function ContentEntryView({ entry }: { entry: ContentEntry }) {
  const showHeading = Boolean(entry.title || entry.subtitle || entry.date);
  return (
    <article className="resume-entry">
      {showHeading && (
        <div className="entry-topline">
          <div>{entry.title && <strong>{entry.title}</strong>}{entry.subtitle && <span className={`entry-role ${entry.title ? "" : "solo"}`}>{entry.subtitle}</span>}</div>
          {entry.date && <time>{entry.date}</time>}
        </div>
      )}
      <div className="resume-rich-text" dangerouslySetInnerHTML={{ __html: renderContentRichText(entry.body) }} />
    </article>
  );
}

interface PreviewFlowItem {
  id: string;
  content: ReactNode;
  keepWithNext?: boolean;
  className?: string;
}

function sectionItems(section: ResumeSection): PreviewFlowItem[] {
  if (section.type === "education") {
    return section.items.map((item) => ({
      id: item.id,
      content: (
        <article className="resume-entry education-entry">
          <div className="entry-topline"><strong>{item.school || "未填写学校"}</strong><time>{item.date}</time></div>
          <div className="education-detail"><span>{[item.major, item.degree].filter(Boolean).join(" | ")}</span><span>{item.detail}</span></div>
        </article>
      ),
    }));
  }
  if (section.type === "content") {
    return section.entries.map((entry) => ({ id: entry.id, content: <ContentEntryView entry={entry} /> }));
  }
  return [];
}

function ResumeProfileContent({ resume }: { resume: ResumeDocument }) {
  const details = resume.profile.details.filter((item) => item.label || item.value);
  return (
    <header className="resume-header">
      <div className="identity">
        <h1>{resume.profile.name || "姓名"}</h1>
        {resume.profile.headline && <p className="headline">{resume.profile.headline}</p>}
        <div className="contact-row primary-contact-row">
          {resume.profile.ageGender && <span>{resume.profile.ageGender}</span>}
          {resume.profile.location && <span>{resume.profile.location}</span>}
        </div>
        <div className="contact-row">
          {resume.profile.phone && <span>手机：{resume.profile.phone}</span>}
          {resume.profile.email && <span>邮箱：{resume.profile.email}</span>}
        </div>
        {details.length > 0 && <div className="profile-detail-grid">{details.map((detail) => (
          <div key={detail.id}>{detail.label}：{detail.value}</div>
        ))}</div>}
      </div>
      <div
        className={`resume-photo ${resume.profile.photo ? "" : "empty"}`}
        style={{ backgroundColor: resume.profile.photoBackground }}
      >
        {resume.profile.photo && <img src={resume.profile.photo} alt="个人照片" />}
      </div>
    </header>
  );
}

export function ResumeProfileView({ resume }: { resume: ResumeDocument }) {
  return <ResumeProfileContent resume={resume} />;
}

export function ResumeSectionView({ section }: { section: ResumeSection }) {
  const items = sectionItems(section);
  return (
    <>
      <SectionHeading>{section.title}</SectionHeading>
      {items.map((item, index) => (
        <div key={item.id} className={index === 0 ? "resume-flow-entry first" : "resume-flow-entry"}>
          {item.content}
        </div>
      ))}
      {!items.length && <p className="resume-empty-module">点击这里填写内容</p>}
    </>
  );
}

function buildFlowItems(resume: ResumeDocument): PreviewFlowItem[] {
  const items: PreviewFlowItem[] = [{
    id: "resume-header",
    className: "resume-flow-header",
    content: <ResumeProfileContent resume={resume} />,
  }];

  resume.sections.filter((section) => section.enabled).forEach((section) => {
    const contentItems = sectionItems(section);
    items.push({
      id: `${section.id}-heading`,
      className: "resume-flow-section",
      keepWithNext: contentItems.length > 0,
      content: <SectionHeading>{section.title}</SectionHeading>,
    });
    contentItems.forEach((item, index) => items.push({
      ...item,
      id: `${section.id}-${item.id}`,
      className: index === 0 ? "resume-flow-entry first" : "resume-flow-entry",
    }));
  });

  return items;
}

interface ResumePreviewProps {
  resume: ResumeDocument;
  zoom: number | "fit";
  templateId?: ResumeTemplateId;
  onPageCountChange?: (pageCount: number) => void;
}

export function ResumePreview({ resume, zoom, templateId, onPageCountChange }: ResumePreviewProps) {
  const activeTemplateId = templateId ?? resume.theme.templateId;
  const activeTemplate = getResumeTemplate(activeTemplateId);
  const templateClasses = `resume-template-${activeTemplate.renderBase} resume-variant-${activeTemplate.styleVariant} resume-template-${activeTemplateId}`;
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const flowItems = useMemo(() => buildFlowItems(resume), [resume]);
  const [pages, setPages] = useState<number[][]>(() => [flowItems.map((_, index) => index)]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (zoom !== "fit" || !scroller) return;
    const update = () => {
      const style = window.getComputedStyle(scroller);
      const width = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setFitZoom(Math.min(1, Math.max(0.1, (width - 2) / 794)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [zoom]);

  useLayoutEffect(() => {
    const page = measureRef.current;
    if (!page) return;

    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const styles = window.getComputedStyle(page);
        const pageHeight = page.clientHeight
          - Number.parseFloat(styles.paddingTop)
          - Number.parseFloat(styles.paddingBottom);
        const elements = Array.from(page.querySelectorAll<HTMLElement>("[data-preview-flow-item]"));
        const measured = elements.map((element, index) => {
          const itemStyles = window.getComputedStyle(element);
          return {
            height: element.getBoundingClientRect().height
              + Number.parseFloat(itemStyles.marginTop)
              + Number.parseFloat(itemStyles.marginBottom),
            keepWithNext: flowItems[index]?.keepWithNext,
          };
        });
        const nextPages = paginatePreviewItems(measured, pageHeight);
        setPages((current) => JSON.stringify(current) === JSON.stringify(nextPages) ? current : nextPages);
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    page.querySelectorAll("img").forEach((image) => image.addEventListener("load", measure));
    void document.fonts?.ready.then(measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      page.querySelectorAll("img").forEach((image) => image.removeEventListener("load", measure));
    };
  }, [activeTemplateId, flowItems]);

  useLayoutEffect(() => onPageCountChange?.(pages.length), [onPageCountChange, pages.length]);

  const density = getDensityLayout(resume.theme.density);
  const pageStyle = {
    "--resume-accent": resume.theme.accent,
    "--section-space": `${density.sectionSpacePx}px`,
    "--entry-space": `${density.entrySpacePx}px`,
    "--body-line": density.bodyLine,
    fontSize: `${density.fontSizePx}px`,
  } as CSSProperties;
  const renderItem = (index: number) => {
    const item = flowItems[index];
    if (!item) return null;
    return <div key={item.id} data-preview-flow-item className={item.className}>{item.content}</div>;
  };

  return (
    <div ref={scrollerRef} className="preview-scroller">
      <div className="preview-zoom-stage" style={{ "--preview-zoom": zoom === "fit" ? fitZoom : zoom / 100 } as CSSProperties}>
        <div className="resume-pages">
          {pages.map((pageItems, pageIndex) => (
            <div className="resume-page-wrap" key={`${pageIndex}-${pageItems.join("-")}`}>
              <div className={`resume-page ${templateClasses}`} data-template={activeTemplateId} data-page-index={pageIndex} style={pageStyle}>{pageItems.map(renderItem)}</div>
              <span className="resume-page-number">第 {pageIndex + 1} 页</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={measureRef} aria-hidden="true" className={`resume-page resume-measure-page ${templateClasses}`} data-template={activeTemplateId} data-page-index="0" style={pageStyle}>
        {flowItems.map((_, index) => renderItem(index))}
      </div>
    </div>
  );
}
