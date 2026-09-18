export function previewUrl(view: "preview" | "html-print", resumeId: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("view", view);
  url.searchParams.set("resumeId", resumeId);
  return url.toString();
}

export function openPreviewWindow(view: "preview" | "html-print", resumeId: string) {
  // Do not retain an opener: native print can pause related browsing contexts.
  // Live preview synchronization uses BroadcastChannel, not the window reference.
  window.open(previewUrl(view, resumeId), "_blank", "noopener,noreferrer");
}
