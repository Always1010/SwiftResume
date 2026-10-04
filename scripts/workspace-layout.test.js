import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import postcss from "postcss";

const stylesheet = postcss.parse(readFileSync(new URL("../src/workspace.css", import.meta.url), "utf8"));

// Assert the desktop grid contract without pretending JSDOM measures layout.
function declarationsFor(selector, width) {
  const result = {};
  stylesheet.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type !== "atrule") continue;
      if (parent.name !== "media") return;
      const maximum = /max-width:\s*(\d+)px/.exec(parent.params);
      if (maximum && width > Number(maximum[1])) return;
    }
    rule.walkDecls((declaration) => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

it.each([1188, 1366, 1920])("reserves a separate directory column at desktop width %s", (width) => {
  expect(declarationsFor(".workspace", width)["grid-template-columns"]).toBe("220px minmax(440px, 1.1fr) minmax(0, 1fr)");
  expect(declarationsFor(".workspace.modules-open", width)["grid-template-columns"]).toBeUndefined();
  expect(declarationsFor(".workspace .sidebar", width).position).toBe("static");
  expect(declarationsFor(".workspace .sidebar", width).inset).toBeUndefined();
  expect(declarationsFor(".workspace.modules-hidden", width)["grid-template-columns"]).toBe("minmax(440px, 1.1fr) minmax(0, 1fr)");
  expect(declarationsFor(".workspace.preview-hidden", width)["grid-template-columns"]).toBe("220px minmax(0, 1fr)");
  expect(declarationsFor(".workspace.preview-hidden.modules-hidden", width)["grid-template-columns"]).toBe("minmax(0, 1fr)");
});

it("never restores an overlay sidebar and lets preview tools wrap in their available column", () => {
  stylesheet.walkRules((rule) => {
    if (!rule.selectors.includes(".workspace .sidebar")) return;
    rule.walkDecls("position", (declaration) => expect(declaration.value).toBe("static"));
  });
  const ui = postcss.parse(readFileSync(new URL("../src/interface.css", import.meta.url), "utf8"));
  ui.walkRules(".preview-toolbar-leading", (rule) => {
    expect(rule.nodes.some((node) => node.prop === "flex-wrap" && node.value === "wrap")).toBe(true);
  });
});
