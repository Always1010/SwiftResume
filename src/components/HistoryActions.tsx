import { AppIcon } from "./AppIcon";
interface HistoryActionsProps {
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryActions({ undoLabel, redoLabel, onUndo, onRedo }: HistoryActionsProps) {
  const undoHint = undoLabel
    ? `撤销修改：${undoLabel}（Ctrl/⌘ + Alt + Z）`
    : "尚未进行可撤销的修改";
  const redoHint = redoLabel
    ? `恢复修改：${redoLabel}（Ctrl/⌘ + Alt + Shift + Z）`
    : "请先撤销一次修改，之后才能恢复";

  return (
    <div className="document-history-actions" role="group" aria-label="编辑历史">
      <span className="history-actions-label" aria-hidden="true">编辑历史</span>
      <span className="history-action-wrap" title={undoHint}>
        <button
          type="button"
          className="secondary-button history-action-button"
          disabled={!undoLabel}
          aria-label={undoHint}
          onClick={onUndo}
        >
          <AppIcon name="undo" />
          <span>撤销修改</span>
        </button>
      </span>
      <span className="history-action-wrap" title={redoHint}>
        <button
          type="button"
          className="secondary-button history-action-button"
          disabled={!redoLabel}
          aria-label={redoHint}
          onClick={onRedo}
        >
          <AppIcon name="undo" className="redo" />
          <span>恢复修改</span>
        </button>
      </span>
    </div>
  );
}
