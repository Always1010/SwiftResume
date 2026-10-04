import { useEffect } from "react";

/** Keep normal typing history with the focused field; Alt explicitly selects document history. */
export function useHistoryShortcuts({ canUndo, canRedo, onChange }: {
  canUndo: boolean;
  canRedo: boolean;
  onChange: (type: "undo" | "redo") => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented || event.getModifierState("AltGraph") || !(event.ctrlKey || event.metaKey)) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable]")));
      if (typing && !event.altKey) return;
      // On macOS Option+Z produces Ω rather than "z". Physical KeyZ preserves
      // the advertised document shortcut while ordinary typing keeps its layout.
      const key = event.altKey && event.code === "KeyZ" ? "z" : event.key.toLowerCase();
      const type = key === "z" ? event.shiftKey ? "redo" : "undo" : key === "y" && !event.altKey && !event.shiftKey ? "redo" : null;
      if (!type) return;
      event.preventDefault();
      if (type === "undo" ? canUndo : canRedo) onChange(type);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canUndo, canRedo, onChange]);
}
