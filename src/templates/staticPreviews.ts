import type { ResumeTemplateId } from "../model/resume";
import type { SCENARIOS } from "../model/contentPresets";
import manifest from "./previewManifest.json";

export const templatePreviewUrl = (id: ResumeTemplateId) => `${import.meta.env.BASE_URL}template-previews/${manifest.templates[id].file}`;

export function scenarioPreviewPages(id: typeof SCENARIOS[number]["id"]) {
  return manifest.scenarios[id].map((page) => ({ ...page, src: `${import.meta.env.BASE_URL}template-previews/${page.file}` }));
}
