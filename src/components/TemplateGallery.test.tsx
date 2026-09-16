// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RESUME_TEMPLATES } from "../templates/registry";
import { createDefaultResume } from "../model/resume";
import { TemplateGallery } from "./TemplateGallery";

describe("TemplateGallery", () => {
  it("renders every registered template and marks the current choice", () => {
    const html = renderToStaticMarkup(<TemplateGallery selectedId="blueprint" resume={createDefaultResume()} onSelect={() => undefined} />);
    expect(RESUME_TEMPLATES).toHaveLength(100);
    expect(html).toContain("为我推荐");
    expect(html).toContain("你准备投递什么方向");
    expect(html).toContain("15 秒找到适合你的样式");
  });
});
