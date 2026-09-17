// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NewResumeDialog } from "./NewResumeDialog";

describe("NewResumeDialog", () => {
  it("offers three career starting points alongside demonstration and blank options", () => {
    const html = renderToStaticMarkup(<NewResumeDialog onSelect={() => undefined} onClose={() => undefined} />);
    expect(html).toContain("应届生 / 实习");
    expect(html).toContain("已有工作经验");
    expect(html).toContain("转行求职");
    expect(html).toContain("搞笑示例演示");
    expect(html).toContain("从空白开始");
    expect(html).toContain("放大查看所选示例");
    expect((html.match(/class="scene-option(?: |")/g) ?? [])).toHaveLength(3);
  });
});
