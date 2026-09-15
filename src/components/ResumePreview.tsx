import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getDensityLayout } from "../model/resume";
import type {
  CustomContentNode,
  ExperienceItem,
  ProjectItem,
  ResumeDocument,
  ResumeSection,
} from "../model/resume";
import { sanitizeRichText } from "../model/richText";
import { paginatePreviewItems } from "../preview/pagination";
import { BlockDocumentPreview } from "./customEditors/BlockDocumentPreview";

function SectionHeading({ children }: { children: string }) {
  return <div className="resume-section-heading"><h2>{children}</h2><span /></div>;
}

function BulletList({ bullets }: { bullets: string[] }) {
  const visible = bullets.filter((item) => item.trim());
  if (!visible.length) return null;
  return <ul>{visible.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>;
}

function ProjectEntry({ item }: { item: ProjectItem }) {
  return (
    <article className="resume-entry">
      <div className="entry-topline">
        <div><strong>{item.name || "未命名项目"}</strong>{item.role && <span className="entry-role">{item.role}</span>}</div>
        <time>{item.date}</time>
      </div>
      {item.stack && <p><b>开发工具：</b>{item.stack}</p>}
      {item.summary && <p><b>项目描述：</b>{item.summary}</p>}
      {item.bullets.some(Boolean) && <p className="responsibility-label"><b>主要内容：</b></p>}
      <BulletList bullets={item.bullets} />
    </article>
  );
}

function ExperienceEntry({ item }: { item: ExperienceItem }) {
  return (
    <article className="resume-entry">
      <div className="entry-topline">
        <div><strong>{item.company || "未命名公司"}</strong>{item.role && <span className="entry-role">{item.role}</span>}</div>
        <time>{item.date}</time>
      </div>
      {item.summary && <p>{item.summary}</p>}
      <BulletList bullets={item.bullets} />
    </article>
  );
}

const customFontFamilies = {
  sans: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif',
  serif: '"Noto Serif CJK SC", "Songti SC", SimSun, serif',
  mono: '"Cascadia Mono", "Microsoft YaHei", monospace',
};

function customTextStyle(node: CustomContentNode, key: string): CSSProperties {
  const style = node.styles?.[key];
  return {
    color: style?.color,
    fontSize: style?.fontSize ? `${style.fontSize}pt` : undefined,
    fontWeight: style?.fontWeight,
    fontFamily: style?.fontFamily ? customFontFamilies[style.fontFamily] : undefined,
  };
}

function CustomNodeView({ node }: { node: CustomContentNode }) {
  if (!node.enabled) return null;
  if (node.type === "title") {
    return (
      <div className="entry-topline custom-title-row">
        <div><strong style={customTextStyle(node, "title")}>{node.title}</strong>{node.subtitle && <span style={customTextStyle(node, "subtitle")} className="entry-role">{node.subtitle}</span>}</div>
        <time style={customTextStyle(node, "date")}>{node.date}</time>
      </div>
    );
  }
  if (node.type === "paragraph") return node.text ? <p style={customTextStyle(node, "text")} className="custom-paragraph">{node.text}</p> : null;
  if (node.type === "bullets") return <ul>{node.items.filter((item) => item.text.trim()).map((item) => <li style={customTextStyle(node, `item:${item.id}`)} key={item.id}>{item.text}</li>)}</ul>;
  return (
    <div className="custom-key-value-preview">
      {node.pairs.filter((pair) => pair.label || pair.value).map((pair) => (
        <div key={pair.id}><span style={customTextStyle(node, `label:${pair.id}`)}>{pair.label}{pair.label && "："}</span><strong style={customTextStyle(node, `value:${pair.id}`)}>{pair.value}</strong></div>
      ))}
    </div>
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
  if (section.type === "skills") {
    return section.items.filter((item) => item.text.trim()).map((item) => ({
      id: item.id,
      content: <ul className="resume-flow-bullet"><li>{item.text}</li></ul>,
    }));
  }
  if (section.type === "projects") {
    return section.items.map((item) => ({ id: item.id, content: <ProjectEntry item={item} /> }));
  }
  if (section.type === "experience") {
    return section.items.map((item) => ({ id: item.id, content: <ExperienceEntry item={item} /> }));
  }
  if (section.type === "awards") {
    return section.items.map((item) => ({
      id: item.id,
      content: <ul className="award-list"><li><span><strong>{item.name}</strong>{item.detail && ` · ${item.detail}`}</span><time>{item.date}</time></li></ul>,
    }));
  }
  if (section.editorMode === "richtext") {
    return [{
      id: `${section.id}-richtext`,
      content: <div className="resume-rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.richText) }} />,
    }];
  }
  if (section.editorMode === "document") {
    return [{
      id: `${section.id}-document`,
      content: <BlockDocumentPreview blocks={section.documentBlocks} hiddenIds={section.hiddenDocumentBlockIds} />,
    }];
  }
  return section.nodes.filter((node) => node.enabled).map((node) => ({
    id: node.id,
    content: <article className="resume-entry custom-content"><CustomNodeView node={node} /></article>,
  }));
}

export function ResumeProfileView({ resume }: { resume: ResumeDocument }) {
  const details = resume.profile.details.filter((item) => item.label || item.value);
  return (
    <>
      <header className="resume-header">
        <div className="identity">
          <h1>{resume.profile.name || "姓名"}</h1>
          {resume.profile.headline && <p className="headline">{resume.profile.headline}</p>}
          <div className="contact-row">
            {resume.profile.ageGender && <span>{resume.profile.ageGender}</span>}
            {resume.profile.location && <span>{resume.profile.location}</span>}
          </div>
          <div className="contact-row">
            {resume.profile.phone && <span>手机 {resume.profile.phone}</span>}
            {resume.profile.email && <span>邮箱 {resume.profile.email}</span>}
          </div>
        </div>
        <div className="resume-photo">{resume.profile.photo ? <img src={resume.profile.photo} alt="个人照片" /> : <span>PHOTO</span>}</div>
      </header>
      {details.length > 0 && (
        <section className="resume-flow-section">
          <SectionHeading>基本信息</SectionHeading>
          <div className="detail-grid">{details.map((detail) => (
            <div key={detail.id}><span>{detail.label}：</span><strong>{detail.value}</strong></div>
          ))}</div>
        </section>
      )}
    </>
  );
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
    content: (
      <header className="resume-header">
        <div className="identity">
          <h1>{resume.profile.name || "姓名"}</h1>
          {resume.profile.headline && <p className="headline">{resume.profile.headline}</p>}
          <div className="contact-row">
            {resume.profile.ageGender && <span>{resume.profile.ageGender}</span>}
            {resume.profile.location && <span>{resume.profile.location}</span>}
          </div>
          <div className="contact-row">
            {resume.profile.phone && <span>手机 {resume.profile.phone}</span>}
            {resume.profile.email && <span>邮箱 {resume.profile.email}</span>}
          </div>
        </div>
        <div className="resume-photo">{resume.profile.photo ? <img src={resume.profile.photo} alt="个人照片" /> : <span>PHOTO</span>}</div>
      </header>
    ),
  }];

  const details = resume.profile.details.filter((item) => item.label || item.value);
  if (details.length) {
    items.push({
      id: "profile-details",
      className: "resume-flow-section",
      content: (
        <section>
          <SectionHeading>基本信息</SectionHeading>
          <div className="detail-grid">{details.map((detail) => (
            <div key={detail.id}><span>{detail.label}：</span><strong>{detail.value}</strong></div>
          ))}</div>
        </section>
      ),
    });
  }

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
  zoom: number;
  onPageCountChange?: (pageCount: number) => void;
}

export function ResumePreview({ resume, zoom, onPageCountChange }: ResumePreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const flowItems = useMemo(() => buildFlowItems(resume), [resume]);
  const [pages, setPages] = useState<number[][]>(() => [flowItems.map((_, index) => index)]);

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
  }, [flowItems]);

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
    <div className="preview-scroller">
      <div className="preview-zoom-stage" style={{ "--preview-zoom": zoom / 100 } as CSSProperties}>
        <div className="resume-pages">
          {pages.map((pageItems, pageIndex) => (
            <div className="resume-page-wrap" key={`${pageIndex}-${pageItems.join("-")}`}>
              <div className="resume-page" style={pageStyle}>{pageItems.map(renderItem)}</div>
              <span className="resume-page-number">第 {pageIndex + 1} 页</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={measureRef} aria-hidden="true" className="resume-page resume-measure-page" style={pageStyle}>
        {flowItems.map((_, index) => renderItem(index))}
      </div>
    </div>
  );
}
