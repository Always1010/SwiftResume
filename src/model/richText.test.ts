import { describe, expect, it } from "vitest";
import { richTextToPlainText } from "./richText";

describe("rich text helpers", () => {
  it("preserves paragraphs and list meaning for PDF export", () => {
    const text = richTextToPlainText("<p>个人总结</p><ul><li>持续改进</li><li>稳定交付</li></ul>");
    expect(text).toContain("个人总结");
    expect(text).toContain("• 持续改进");
    expect(text).toContain("• 稳定交付");
  });
});
