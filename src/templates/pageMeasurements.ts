import type { ResumeDocument, ResumeTemplateId } from "../model/resume";
import type { OutputEngine } from "../settings/appSettings";

export interface TemplatePageMeasurement {
  contentKey: string;
  templateId: ResumeTemplateId;
  engine: OutputEngine;
  pageCount: number;
}

// A template switch must keep measurements for the other templates. Metadata
// does not affect pagination, but every content, photo and style change does.
export function templatePageCountContentKey(resume: ResumeDocument): string {
  const { templateId: _templateId, ...style } = resume.theme;
  return JSON.stringify({ profile: resume.profile, sections: resume.sections, style });
}

export function isMeasuredPageCount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
