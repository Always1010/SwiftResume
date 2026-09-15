import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StandalonePreview } from "./components/StandalonePreview";
import "./styles.css";
import "./editorModes.css";

const parameters = new URLSearchParams(window.location.search);
const standalonePreview = parameters.get("view") === "preview";
const previewResumeId = parameters.get("resumeId") ?? "";
document.body.classList.toggle("standalone-preview-body", standalonePreview);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {standalonePreview ? <StandalonePreview resumeId={previewResumeId} /> : <App />}
  </StrictMode>,
);
