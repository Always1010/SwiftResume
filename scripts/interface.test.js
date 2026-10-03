import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("uses visible thin scrollbars globally with hover and forced-color fallback", () => {
  const style = readFileSync(new URL("../src/interface.css", import.meta.url), "utf8");
  expect(style).toContain("scrollbar-width: thin");
  expect(style).toContain("::-webkit-scrollbar-thumb:hover");
  expect(style).toContain("forced-colors: active");
  expect(style).not.toContain("scrollbar-width: none");
  expect(style).not.toContain(".resume-page {");
});
it("keeps duplicate appearance controls out of the editor toolbar", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  expect(app).not.toContain("preview-appearance-controls");
  const templates = readFileSync(new URL("../src/components/StandalonePreview.tsx", import.meta.url), "utf8");
  expect(templates).toContain("模板预览排版密度"); expect(templates).toContain("模板预览配色");
});
