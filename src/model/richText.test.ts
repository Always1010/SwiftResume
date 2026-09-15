// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { richTextToPlainText, sanitizeRichText } from "./richText";

describe("rich text helpers", () => {
  it("preserves paragraphs and list meaning for PDF export", () => {
    const text = richTextToPlainText("<p>个人总结</p><ul><li>持续改进</li><li>稳定交付</li></ul>");
    expect(text).toContain("个人总结");
    expect(text).toContain("• 持续改进");
    expect(text).toContain("• 稳定交付");
  });

  it("keeps supported typography while removing unsafe markup and styles", () => {
    const html = sanitizeRichText('<h2 style="text-align: center; position: fixed"><span style="font-size: 14pt; font-family: SimSun; font-weight: 700; color: #123456; transform: rotate(1deg)">标题</span></h2><script>alert(1)</script>');
    expect(html).toContain("<h2");
    expect(html).toContain("text-align: center");
    expect(html).toContain("font-size: 14pt");
    expect(html).toContain("font-family: SimSun");
    expect(html).toContain("font-weight: 700");
    expect(html).toContain("color:");
    expect(html).not.toContain("position");
    expect(html).not.toContain("transform");
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert");
  });

  it("retains table structure and safe links", () => {
    const html = sanitizeRichText('<table><tbody><tr><td colspan="2" onclick="evil()">内容</td></tr></tbody></table><a href="https://example.com" target="_blank">链接</a>');
    expect(html).toContain('<td colspan="2">内容</td>');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("target");
  });
});
