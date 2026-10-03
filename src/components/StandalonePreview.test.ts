import { describe, expect, it } from "vitest";
import {
  MAX_TEMPLATE_GALLERY_WIDTH,
  MIN_TEMPLATE_GALLERY_WIDTH,
  clampTemplateGalleryWidth,
} from "./StandalonePreview";

describe("template gallery width", () => {
  it("supports a wide 860px gallery while respecting the available workspace", () => {
    expect(clampTemplateGalleryWidth(100)).toBe(MIN_TEMPLATE_GALLERY_WIDTH);
    expect(clampTemplateGalleryWidth(700)).toBe(700);
    expect(clampTemplateGalleryWidth(1000)).toBe(MAX_TEMPLATE_GALLERY_WIDTH);
    expect(clampTemplateGalleryWidth(800, 640)).toBe(640);
  });
});
