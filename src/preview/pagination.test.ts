import { describe, expect, it } from "vitest";
import { paginatePreviewItems } from "./pagination";

describe("paginatePreviewItems", () => {
  it("把超出页面高度的条目放到下一页", () => {
    expect(paginatePreviewItems([
      { height: 60 },
      { height: 50 },
      { height: 40 },
    ], 100)).toEqual([[0], [1, 2]]);
  });

  it("让分节标题与下一条内容保持在同一页", () => {
    expect(paginatePreviewItems([
      { height: 70 },
      { height: 15, keepWithNext: true },
      { height: 30 },
    ], 100)).toEqual([[0], [1, 2]]);
  });

  it("允许单个超高条目独占一页", () => {
    expect(paginatePreviewItems([{ height: 120 }, { height: 20 }], 100)).toEqual([[0], [1]]);
  });
});
