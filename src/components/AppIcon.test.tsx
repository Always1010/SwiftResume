// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { BrandMark } from "./AppIcon";

it("reuses the packaged extension identity without redrawing or recoloring it", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<BrandMark />);
  const icon = container.querySelector("img")!;
  expect(icon.getAttribute("src")).toBe(`./${manifest.icons["128"]}`);
  expect(icon.width).toBe(36);
  expect(icon.height).toBe(36);
  expect(icon.alt).toBe("");
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("svg")).toBeNull();
  expect(readFileSync(`public/${manifest.icons["128"]}`).length).toBeGreaterThan(0);
});
