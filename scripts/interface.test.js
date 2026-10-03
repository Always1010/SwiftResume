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

it("sizes short native dialogs to their content rather than stretching between modal insets", () => {
  const style = readFileSync(new URL("../src/workspace.css", import.meta.url), "utf8");
  expect(style).toContain(".flow-dialog[open] { display: block; height: fit-content; }");
});

it("defines screen-only interface colors without overriding resume theme variables", () => {
  const style = readFileSync(new URL("../src/interface.css", import.meta.url), "utf8");
  const refresh = style.split("/* Calm application surfaces:")[1];
  expect(refresh).toBeTruthy();
  expect(refresh).not.toMatch(/--resume-[\w-]+\s*:/);
  expect(refresh).not.toMatch(/\.resume-(?:page|header|section|rich-text)\s*[{,]/);
  expect(refresh).toContain("@media screen");
  expect(refresh).toContain("focus-visible");
  expect(refresh).toContain("prefers-reduced-motion: reduce");
  expect(refresh).not.toContain("linear-gradient");
  const token = (name) => refresh.match(new RegExp(`--ui-${name}: (#[a-f0-9]{6})`))[1];
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const contrast = (left, right) => { const a = luminance(left), b = luminance(right); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  for (const background of ["canvas", "surface", "subtle", "selected"]) {
    expect(contrast(token("text"), token(background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("muted"), token(background))).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast("#ffffff", token("accent"))).toBeGreaterThanOrEqual(4.5);
});
