import { useMemo } from "react";
import { createDefaultResume, type ResumeTemplateId } from "../model/resume";
import { ResumePreview } from "./ResumePreview";

export function TemplateThumbnailCapture({ templateId }: { templateId: ResumeTemplateId }) {
  const resume = useMemo(() => {
    const sample = createDefaultResume();
    sample.theme = { ...sample.theme, templateId, density: 42, accent: "#596d82" };
    return sample;
  }, [templateId]);

  return (
    <main className="template-thumbnail-capture" aria-label={`${templateId}模板缩略图生成页`}>
      <ResumePreview resume={resume} zoom={42} templateId={templateId} thumbnail />
    </main>
  );
}
