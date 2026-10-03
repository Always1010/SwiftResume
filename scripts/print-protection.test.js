import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("excludes prepared same-tab printing from the browser-menu warning page", () => {
  const style = readFileSync(new URL("../src/typstPreview.css", import.meta.url), "utf8");
  expect(style).toContain("body:not(.html-print-body):not(.swift-resume-printing)::after");
  expect(style).not.toContain("body:not(.html-print-body)::after");
});
