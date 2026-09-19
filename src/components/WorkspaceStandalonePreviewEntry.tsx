export function WorkspaceStandalonePreviewEntry({ disabled, onOpen }: { disabled?: boolean; onOpen: () => void }) {
  return <button
    type="button"
    className="workspace-standalone-preview-entry"
    aria-label="打开独立预览并更换简历模板"
    disabled={disabled}
    onClick={onOpen}
  >
    ↗ 独立预览 / 更换模板
  </button>;
}
