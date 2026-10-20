import { describe, expect, it } from "vitest";
import { scaleToFit } from "./imageCompression";

describe("scaleToFit", () => {
  it("mantém imagens que já cabem no limite", () => {
    expect(scaleToFit(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("reduz pelo maior lado preservando a proporção", () => {
    expect(scaleToFit(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaleToFit(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });
});
