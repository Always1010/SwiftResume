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
  const refresh = style;
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
  expect(contrast("#ffffff", token("ink"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#ffffff", token("ink-hover"))).toBeGreaterThanOrEqual(4.5);
});


it("reuses the extension brand icon and one consistent application control icon system", () => {
  const icons = readFileSync(new URL("../src/components/AppIcon.tsx", import.meta.url), "utf8");
  expect(icons).toContain('src="./icons/icon128.png"');
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8"));
  expect(manifest.icons["128"]).toBe("icons/icon128.png");
  expect(readFileSync(new URL(`../public/${manifest.icons["128"]}`, import.meta.url)).length).toBeGreaterThan(0);
  expect(icons).toContain('aria-hidden="true"');
  for (const name of ["App.tsx", "components/StandalonePreview.tsx"]) {
    const source = readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");
    expect(source).toContain("<BrandMark />");
    expect(source).not.toMatch(/brand-mark[^>]*>S</);
  }
});

it("removes legacy green application values instead of layering new colors over them", () => {
  const files = ["workspace.css", "historyActions.css", "interface.css"];
  for (const file of files) {
    const css = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    expect(css).not.toMatch(/var\(--green(?:-dark)?\)/);
    expect(css).not.toMatch(/#(?:176b45|245f4c|247352|eef7f1|f0f5f1)\b/i);
  }
  const base = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8").split("\n.resume-page {")[0];
  expect(base).not.toMatch(/var\(--green(?:-dark)?\)/);
  const richControls = readFileSync(new URL("../src/editorModes.css", import.meta.url), "utf8").split("\n").filter((line) => !line.startsWith(".resume-rich-text")).join("\n");
  expect(richControls).not.toContain("var(--green)");
});

it("defines normal, hover, active, focus and disabled states for the new controls", () => {
  const css = readFileSync(new URL("../src/interface.css", import.meta.url), "utf8");
  for (const selector of [".primary-button {", ".primary-button:hover:not(:disabled)", ".primary-button:active:not(:disabled)", ".primary-button:disabled", ".secondary-button:active:not(:disabled)", ".ghost-button:hover:not(:disabled)", "focus-visible"]) expect(css).toContain(selector);
  expect(css).toContain(".settings-navigation button[aria-pressed=\"true\"]");
});
