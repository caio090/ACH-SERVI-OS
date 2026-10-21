import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safeRedirect";

describe("safeRedirectPath", () => {
  it("mantém caminhos internos", () => {
    expect(safeRedirectPath("/pedidos/abc")).toBe("/pedidos/abc");
    expect(safeRedirectPath("/pedir?retomar=1")).toBe("/pedir?retomar=1");
  });

  it("bloqueia destinos externos e malformados", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/\\/evil", "javascript:alert(1)", "", null, "/a\nb"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });
});
