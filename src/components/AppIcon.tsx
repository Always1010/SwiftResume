import type { CSSProperties } from "react";

const paths = {
  document: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M8 12h8M8 16h6",
  chevron: "m8 10 4 4 4-4",
  settings: "M4 7h7m4 0h5M4 17h3m4 0h9M11 4v6M7 14v6",
  download: "M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4",
  panels: "M4 4h16v16H4V4Zm6 0v16M7 8h0M7 12h0M7 16h0",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  eyeOff: "m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-3.1 4.1M6.3 6.3A18 18 0 0 0 2 12s3 7 10 7a12 12 0 0 0 5.3-1.3",
  template: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  edit: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  arrowLeft: "M20 12H4m6-6-6 6 6 6",
  arrowRight: "M4 12h16m-6-6 6 6-6 6",
  copy: "M9 9h11v11H9V9ZM15 5V3H3v12h2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  search: "m16 16 5 5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  user: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 8 0 0 1 16 0v2",
  archive: "M4 3h16v5H4V3Zm1 5v13h14V8M9 12h6",
  undo: "m9 5-5 5 5 5M4 10h10a6 6 0 0 1 6 6v3",
} as const;

export type AppIconName = keyof typeof paths;

/** Application controls only; never rendered into a resume or PDF. */
export function AppIcon({ name, className = "", style }: { name: AppIconName; className?: string; style?: CSSProperties }) {
  return <svg className={`app-icon ${className}`} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><AppIcon name="document" /></span>;
}
