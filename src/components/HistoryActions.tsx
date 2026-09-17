interface HistoryActionsProps {
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
}

function HistoryArrowIcon({ direction }: { direction: "undo" | "redo" }) {
  return (
    <svg className={`history-action-icon ${direction === "redo" ? "redo" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
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
          <HistoryArrowIcon direction="undo" />
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
          <HistoryArrowIcon direction="redo" />
          <span>恢复修改</span>
        </button>
      </span>
    </div>
  );
}
