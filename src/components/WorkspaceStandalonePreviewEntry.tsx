import { AppIcon } from "./AppIcon";
export function WorkspaceStandalonePreviewEntry({ disabled, onOpen }: { disabled?: boolean; onOpen: () => void }) {
  return <button
    type="button"
    className="workspace-standalone-preview-entry"
    aria-label="打开模板与预览"
    disabled={disabled}
    onClick={onOpen}
  >
    <AppIcon name="template" />模板与预览
  </button>;
}
