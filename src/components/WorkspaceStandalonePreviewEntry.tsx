import { AppIcon } from "./AppIcon";
export function WorkspaceStandalonePreviewEntry({ disabled, onOpen }: { disabled?: boolean; onOpen: () => void }) {
  return <button
    type="button"
    className="secondary-button workspace-standalone-preview-entry"
    title="前往模板与完整预览（当前标签页）"
    aria-label="打开模板与预览"
    disabled={disabled}
    onClick={onOpen}
  >
    <AppIcon name="template" />模板与预览<AppIcon name="arrowRight" />
  </button>;
}
