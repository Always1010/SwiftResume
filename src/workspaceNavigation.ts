export type WorkspaceView = "editor" | "preview";
export function currentWorkspaceView(): WorkspaceView {
  return new URLSearchParams(window.location.search).get("view") === "preview" ? "preview" : "editor";
}
export function navigateWorkspace(view: WorkspaceView, resumeId: string, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.searchParams.delete("resumeId");
  if (view === "preview") { url.searchParams.set("view", view); url.searchParams.set("resumeId", resumeId); }
  window.history[replace ? "replaceState" : "pushState"]({ swiftResumeView: view }, "", url);
}
