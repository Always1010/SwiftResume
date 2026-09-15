// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderContentRichText } from "./contentRichText";

describe("content rich text renderer", () => {
  it("renders the supported advanced formatting from the shared JSON document", () => {
    const html = renderContentRichText({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { indent: 2, textAlign: "right" },
        content: [{
          type: "text",
          text: "高级格式",
          marks: [{
            type: "textStyle",
            attrs: {
              fontSize: "14pt",
              fontFamily: "SimSun",
              fontWeight: "600",
              color: "#123456",
              lineHeight: "1.6",
            },
          }, { type: "highlight", attrs: { color: "#fff3a3" } }],
        }],
      }],
    });

    expect(html).toContain("margin-left: 4em");
    expect(html).toContain("text-align: right");
    expect(html).toContain("font-size: 14pt");
    expect(html).toContain("font-family: SimSun");
    expect(html).toContain("font-weight: 600");
    expect(html).toContain("line-height: 1.6");
    expect(html).toContain("background-color:");
  });
});
