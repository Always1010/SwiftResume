import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type {
  CustomSection,
  ExperienceSection,
  ProjectsSection,
  ResumeDocument,
  ResumeSection,
} from "../model/resume";

function SectionHeading({ children }: { children: string }) {
  return <div className="resume-section-heading"><h2>{children}</h2><span /></div>;
}

function BulletList({ bullets }: { bullets: string[] }) {
  const visible = bullets.filter((item) => item.trim());
  if (!visible.length) return null;
  return <ul>{visible.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>;
}

function Projects({ section }: { section: ProjectsSection }) {
  return <>{section.items.map((item) => (
    <article className="resume-entry" key={item.id}>
      <div className="entry-topline">
        <div><strong>{item.name || "未命名项目"}</strong>{item.role && <span className="entry-role">{item.role}</span>}</div>
        <time>{item.date}</time>
      </div>
      {item.stack && <p><b>开发工具：</b>{item.stack}</p>}
      {item.summary && <p><b>项目描述：</b>{item.summary}</p>}
      {item.bullets.some(Boolean) && <p className="responsibility-label"><b>主要内容：</b></p>}
      <BulletList bullets={item.bullets} />
    </article>
  ))}</>;
}

function Experience({ section }: { section: ExperienceSection }) {
  return <>{section.items.map((item) => (
    <article className="resume-entry" key={item.id}>
      <div className="entry-topline">
        <div><strong>{item.company || "未命名公司"}</strong>{item.role && <span className="entry-role">{item.role}</span>}</div>
        <time>{item.date}</time>
      </div>
      {item.summary && <p>{item.summary}</p>}
      <BulletList bullets={item.bullets} />
    </article>
  ))}</>;
}

function Custom({ section }: { section: CustomSection }) {
  return <>{section.items.map((item) => (
    <article className="resume-entry" key={item.id}>
      <div className="entry-topline">
        <div><strong>{item.title}</strong>{item.subtitle && <span className="entry-role">{item.subtitle}</span>}</div>
        <time>{item.date}</time>
      </div>
      {item.description && <p>{item.description}</p>}
      <BulletList bullets={item.bullets} />
    </article>
  ))}</>;
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  if (!section.enabled) return null;
  return (
    <section className="resume-section">
      <SectionHeading>{section.title}</SectionHeading>
      {section.type === "education" && section.items.map((item) => (
        <article className="resume-entry education-entry" key={item.id}>
          <div className="entry-topline"><strong>{item.school || "未填写学校"}</strong><time>{item.date}</time></div>
          <div className="education-detail"><span>{[item.major, item.degree].filter(Boolean).join(" | ")}</span><span>{item.detail}</span></div>
        </article>
      ))}
      {section.type === "skills" && <BulletList bullets={section.items.map((item) => item.text)} />}
      {section.type === "projects" && <Projects section={section} />}
      {section.type === "experience" && <Experience section={section} />}
      {section.type === "awards" && (
        <ul className="award-list">{section.items.map((item) => (
          <li key={item.id}><span><strong>{item.name}</strong>{item.detail && ` · ${item.detail}`}</span><time>{item.date}</time></li>
        ))}</ul>
      )}
      {section.type === "custom" && <Custom section={section} />}
    </section>
  );
}

interface ResumePreviewProps {
  resume: ResumeDocument;
  onOverflowChange: (overflow: boolean) => void;
}

export function ResumePreview({ resume, onOverflowChange }: ResumePreviewProps) {
  const pageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const measure = () => onOverflowChange(page.scrollHeight > page.clientHeight + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  }, [resume, onOverflowChange]);

  return (
    <div className="preview-scroller">
      <div ref={pageRef} className={`resume-page density-${resume.theme.density}`} style={{ "--resume-accent": resume.theme.accent } as CSSProperties}>
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
        {resume.profile.details.some((item) => item.label || item.value) && (
          <section className="resume-section profile-details">
            <SectionHeading>基本信息</SectionHeading>
            <div className="detail-grid">{resume.profile.details.map((detail) => (
              <div key={detail.id}><span>{detail.label}：</span><strong>{detail.value}</strong></div>
            ))}</div>
          </section>
        )}
        {resume.sections.map((section) => <ResumeSectionView section={section} key={section.id} />)}
      </div>
    </div>
  );
}
