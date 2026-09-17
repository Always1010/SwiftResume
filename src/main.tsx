import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StandalonePreview } from "./components/StandalonePreview";
import { TemplateThumbnailCapture } from "./components/TemplateThumbnailCapture";
import { normalizeResumeTemplateId } from "./model/resume";
import "./styles.css";
import "./editorModes.css";
import "./workspace.css";

const parameters = new URLSearchParams(window.location.search);
const standalonePreview = parameters.get("view") === "preview";
const thumbnailCapture = parameters.get("view") === "template-thumbnail";
const previewResumeId = parameters.get("resumeId") ?? "";
const thumbnailTemplateId = normalizeResumeTemplateId(parameters.get("templateId"));
document.body.classList.toggle("standalone-preview-body", standalonePreview);
document.body.classList.toggle("template-thumbnail-body", thumbnailCapture);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {thumbnailCapture
      ? <TemplateThumbnailCapture templateId={thumbnailTemplateId} />
      : standalonePreview
        ? <StandalonePreview resumeId={previewResumeId} />
        : <App />}
  </StrictMode>,
);
