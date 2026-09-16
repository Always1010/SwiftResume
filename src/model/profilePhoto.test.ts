import { describe, expect, it } from "vitest";
import { calculatePhotoCrop } from "./profilePhoto";

describe("profile photo crop", () => {
  it("center-crops a wide image to the requested portrait ratio", () => {
    expect(calculatePhotoCrop(1200, 800, 600, 800, { zoom: 1, offsetX: 0, offsetY: 0 })).toEqual({
      x: 300,
      y: 0,
      width: 600,
      height: 800,
    });
  });

  it("supports zooming and moving the crop to each source edge", () => {
    expect(calculatePhotoCrop(1200, 800, 600, 800, { zoom: 2, offsetX: -100, offsetY: 100 })).toEqual({
      x: 0,
      y: 400,
      width: 300,
      height: 400,
    });
  });
});
