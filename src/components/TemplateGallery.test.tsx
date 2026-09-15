// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATES } from "../templates/registry";
import { TemplateGallery } from "./TemplateGallery";

describe("TemplateGallery", () => {
  it("renders every registered template and marks the current choice", () => {
    const html = renderToStaticMarkup(<TemplateGallery selectedId="blueprint" onSelect={() => undefined} />);
    expect((html.match(/template-gallery-card/g) ?? [])).toHaveLength(RESUME_TEMPLATES.length);
    expect(html).toContain("建筑蓝图");
    expect(html).toContain("29 套");
    expect(html).toContain('aria-label="预览建筑蓝图模板"');
    expect(html).toContain('aria-pressed="true"');
  });
});
