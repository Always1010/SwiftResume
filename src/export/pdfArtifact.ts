import type { ResumeDocument } from "../model/resume";
import type { GeneratedPdf } from "./typstPdf";

// All output surfaces share these bytes. Editing metadata does not invalidate layout.
export function pdfContentKey(resume: ResumeDocument): string {
  return JSON.stringify({ profile: resume.profile, sections: resume.sections, theme: resume.theme }, (key, value) => key === "id" ? undefined : value);
}

const artifacts = new Map<string, Promise<Blob>>();
export function getPdfArtifact(resume: ResumeDocument): Promise<GeneratedPdf> {
  const key = pdfContentKey(resume);
  let pending = artifacts.get(key);
  if (!pending) {
    const snapshot = structuredClone(resume);
    pending = import("./typstPdf").then(({ generateTypstPdf }) => generateTypstPdf(snapshot)).then((pdf) => pdf.blob);
    artifacts.set(key, pending);
    const request = pending;
    void pending.catch(() => { if (artifacts.get(key) === request) artifacts.delete(key); });
    // Bound retained photos and PDF data. Mounted readers retain their own artifacts.
    if (artifacts.size > 12) artifacts.delete(artifacts.keys().next().value!);
  }
  const filename = `${resume.title.replace(/[\\/:*?"<>|]/g, "-") || "SwiftResume"}.pdf`;
  return pending.then((blob) => ({ blob, filename }));
}
