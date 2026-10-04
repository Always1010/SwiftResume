import { shortcut } from "../keyboardShortcuts";
import { AppIcon } from "./AppIcon";
interface HistoryActionsProps {
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryActions({ undoLabel, redoLabel, onUndo, onRedo }: HistoryActionsProps) {
  const undoKey = shortcut("Mod+Alt+Z");
  const redoKey = shortcut("Mod+Alt+Shift+Z");
  const undoHint = `${undoLabel ? `撤销修改：${undoLabel}` : "尚未进行可撤销的修改"}（${undoKey.label}，整份简历）`;
  const redoHint = `${redoLabel ? `恢复修改：${redoLabel}` : "请先撤销一次修改，之后才能恢复"}（${redoKey.label}，整份简历）`;


  return (
    <div className="document-history-actions" role="group" aria-label="编辑历史">
      <span className="history-actions-label" aria-hidden="true">编辑历史</span>
      <span className="history-action-wrap" title={undoHint} tabIndex={!undoLabel ? 0 : undefined} aria-label={!undoLabel ? undoHint : undefined}>
        <button
          type="button"
          className="secondary-button history-action-button"
          disabled={!undoLabel}
          aria-label={undoHint}
          aria-keyshortcuts={undoKey.aria}
          title={undoHint}
          onClick={onUndo}
        >
          <AppIcon name="undo" />
          <span>撤销修改</span>
        </button>
      </span>
      <span className="history-action-wrap" title={redoHint} tabIndex={!redoLabel ? 0 : undefined} aria-label={!redoLabel ? redoHint : undefined}>
        <button
          type="button"
          className="secondary-button history-action-button"
          disabled={!redoLabel}
          aria-label={redoHint}
          aria-keyshortcuts={redoKey.aria}
          title={redoHint}
          onClick={onRedo}
        >
          <AppIcon name="undo" className="redo" />
          <span>恢复修改</span>
        </button>
      </span>
    </div>
  );
}
