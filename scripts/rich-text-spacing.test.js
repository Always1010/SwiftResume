import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps consecutive whitespace in the shared HTML rich-text output", () => {
  const stylesheet = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  expect(stylesheet).toMatch(/\.resume-rich-text\s*\{[^}]*white-space:\s*pre-wrap/);
});
