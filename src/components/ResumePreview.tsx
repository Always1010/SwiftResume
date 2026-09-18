import { lazy, Suspense, useState, type ReactNode } from "react";
import { useTypstPreview } from "../export/useTypstPreview";
import type { ContentEntry, ResumeDocument, ResumeSection, ResumeTemplateId } from "../model/resume";
import { renderContentRichText } from "../model/contentRichText";
import { EDUCATION_LAYOUT, PROFILE_LAYOUT, profileInfoRows } from "../model/resumeLayout";
import "../typstPreview.css";
import type { OutputEngine } from "../settings/appSettings";

const PdfCanvasPreview = lazy(() => import("./PdfCanvasPreview"));
const HtmlCanvasPreview = lazy(() => import("./HtmlPrintPreview").then((module) => ({ default: module.HtmlCanvasPreview })));

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
          <div className="education-detail" style={{ gridTemplateColumns: `fit-content(${EDUCATION_LAYOUT.maxLeftPercent}%) minmax(0, 1fr)`, columnGap: EDUCATION_LAYOUT.columnGapPx }}><span>{[item.major, item.degree].filter(Boolean).join(" | ")}</span><span>{item.detail}</span></div>
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
  const infoRows = profileInfoRows(resume.profile);
  return (
    <header className="resume-header">
      <div className="identity">
        <h1>{resume.profile.name || "姓名"}</h1>
        {resume.profile.headline && <p className="headline">{resume.profile.headline}</p>}
        <div className="contact-row primary-contact-row">
          {resume.profile.ageGender && <span>{resume.profile.ageGender}</span>}
          {resume.profile.location && <span>{resume.profile.location}</span>}
        </div>
        {infoRows.length > 0 && <div className="profile-info-grid" style={{
          gridTemplateColumns: `minmax(0, min(${PROFILE_LAYOUT.firstColumnEm}em, 45%)) minmax(0, 1fr)`,
          columnGap: `${PROFILE_LAYOUT.columnGapEm}em`, rowGap: PROFILE_LAYOUT.rowGapPx,
        }}>{infoRows.map((row) => (
          <div className="profile-info-row" key={row.id}>
            <span style={row.right === undefined ? { gridColumn: "1 / -1" } : undefined}>{row.left}</span>
            {row.right !== undefined && <span>{row.right}</span>}
          </div>
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

interface ResumePreviewProps {
  engine?: OutputEngine;
  resume: ResumeDocument;
  zoom: number | "fit";
  templateId?: ResumeTemplateId;
  onPageCountChange?: (pageCount: number) => void;
  onReadyChange?: (ready: boolean) => void;
  thumbnail?: boolean;
}

// The editor, HTML preview and browser printing share the views above.
// The output setting selects HTML or the existing Typst PDF preview.
export function ResumePreview(props: ResumePreviewProps) {
  if (props.engine === "html") return <Suspense fallback={<p role="status">正在加载 HTML 预览…</p>}><HtmlCanvasPreview resume={props.resume} zoom={props.zoom} onPageCountChange={props.onPageCountChange} onReadyChange={props.onReadyChange} /></Suspense>;
  return <TypstPreview {...props} />;
}

function TypstPreview({ resume, zoom, templateId, onPageCountChange, thumbnail = false }: ResumePreviewProps) {
  const document = templateId ? { ...resume, theme: { ...resume.theme, templateId } } : resume;
  const { blob, updating, error, retry } = useTypstPreview(document);
  const [thumbnailImage, setThumbnailImage] = useState<{ blob: Blob; source: string } | null>(null);
  return <div className={`preview-scroller typst-preview ${thumbnail ? "typst-thumbnail" : ""}`} aria-busy={updating && !error}>
    {(updating || error) && <div className="typst-preview-status" role={error ? "alert" : "status"}>
      {error ? <><span>预览更新失败：{error}{blob && "。下方仍为上次生成的版本。"}</span>{!thumbnail && <button type="button" onClick={retry}>重新生成</button>}</> : updating ? (blob ? "正在更新排版 · 下方为上次生成的版本…" : "正在生成预览…") : null}
    </div>}
    {blob && (thumbnail && thumbnailImage?.blob === blob
      ? <img className="typst-thumbnail-image" src={thumbnailImage.source} alt="Typst PDF 首页" />
      : <Suspense fallback={<p role="status">正在打开 PDF…</p>}><PdfCanvasPreview blob={blob} zoom={zoom} onPageCountChange={onPageCountChange} thumbnail={thumbnail} onThumbnailReady={thumbnail ? (source) => setThumbnailImage({ blob, source }) : undefined} /></Suspense>)}
  </div>;
}
