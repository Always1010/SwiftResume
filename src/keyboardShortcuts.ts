/** Labels share the exact modifier vocabulary used by keyboard handlers. */
export function isApplePlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function shortcut(keys: string, apple = isApplePlatform()) {
  const parts = keys.split("+");
  return {
    label: parts.map((key) => key === "Mod" ? apple ? "⌘ Cmd" : "Ctrl" : key === "Alt" && apple ? "⌥ Option" : key).join(" + "),
    aria: parts.map((key) => key === "Mod" ? apple ? "Meta" : "Control" : key).join("+"),
  };
}
