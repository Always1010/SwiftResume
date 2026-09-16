// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NewResumeDialog } from "./NewResumeDialog";

describe("NewResumeDialog", () => {
  it("offers exactly the default and blank content templates", () => {
    const html = renderToStaticMarkup(<NewResumeDialog onSelect={() => undefined} onClose={() => undefined} />);
    expect(html).toContain("默认模板");
    expect(html).toContain("空白模板");
    expect(html).toContain("搞笑反差示例");
    expect((html.match(/new-resume-option(?: |\")/g) ?? [])).toHaveLength(2);
  });
});
