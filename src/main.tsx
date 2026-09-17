import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StandalonePreview } from "./components/StandalonePreview";
import { normalizeResumeTemplateId } from "./model/resume";
import "./styles.css";
import "./editorModes.css";
import "./historyActions.css";
import "./workspace.css";

const parameters = new URLSearchParams(window.location.search);
const standalonePreview = parameters.get("view") === "preview";
const thumbnailCapture = import.meta.env.DEV && parameters.get("view") === "template-thumbnail";
const previewResumeId = parameters.get("resumeId") ?? "";
const thumbnailTemplateId = normalizeResumeTemplateId(parameters.get("templateId"));
document.body.classList.toggle("standalone-preview-body", standalonePreview);
document.body.classList.toggle("template-thumbnail-body", thumbnailCapture);

async function renderApp() {
  // The capture module and its PDF.js renderer are development tooling only.
  if (import.meta.env.DEV && thumbnailCapture) {
    const { TemplateThumbnailCapture } = await import("./components/TemplateThumbnailCapture");
    createRoot(document.getElementById("root")!).render(<StrictMode><TemplateThumbnailCapture templateId={thumbnailTemplateId} /></StrictMode>);
    return;
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>{standalonePreview ? <StandalonePreview resumeId={previewResumeId} /> : <App />}</StrictMode>,
  );
}
void renderApp();
