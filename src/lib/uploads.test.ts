import { describe, expect, it } from "vitest";
import { buildImageObjectPath, detectImageMime, IMAGE_UPLOAD_RULES, validateImageBytes } from "./uploads";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const WINDOWS_EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const FOLDER = "3f2b8c1e-9d4a-4b6e-8f10-2a3b4c5d6e7f";
const OBJECT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("detectImageMime", () => {
  it("reconhece JPEG, PNG e WEBP pela assinatura", () => {
    expect(detectImageMime(JPEG)).toBe("image/jpeg");
    expect(detectImageMime(PNG)).toBe("image/png");
    expect(detectImageMime(WEBP)).toBe("image/webp");
  });

  it("rejeita executável, PDF e SVG mesmo que renomeados para .jpg", () => {
    expect(detectImageMime(WINDOWS_EXE)).toBeNull();
    expect(detectImageMime(PDF)).toBeNull();
    expect(detectImageMime(SVG)).toBeNull();
  });

  it("rejeita RIFF que não é WEBP (ex.: WAV/AVI)", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    expect(detectImageMime(wav)).toBeNull();
  });
});

describe("validateImageBytes", () => {
  it("aceita imagem válida e devolve a extensão derivada do conteúdo", () => {
    const result = validateImageBytes(PNG);
    expect(result).toMatchObject({ ok: true, mime: "image/png", extension: "png" });
  });

  it("rejeita arquivo vazio, gigante e de tipo inesperado", () => {
    expect(validateImageBytes(new Uint8Array())).toMatchObject({ ok: false });
    const huge = new Uint8Array(IMAGE_UPLOAD_RULES.maxBytes + 1);
    huge.set(JPEG);
    expect(validateImageBytes(huge)).toMatchObject({ ok: false, error: expect.stringContaining("muito grande") });
    expect(validateImageBytes(WINDOWS_EXE)).toMatchObject({ ok: false, error: expect.stringContaining("Formato") });
  });
});

describe("buildImageObjectPath", () => {
  it("gera {pasta}/{uuid}.{ext} sem usar o nome original", () => {
    expect(buildImageObjectPath(FOLDER, "jpg", OBJECT)).toBe(`${FOLDER}/${OBJECT}.jpg`);
  });

  it("bloqueia path traversal e extensões fora da lista", () => {
    expect(() => buildImageObjectPath("../outro-usuario", "jpg", OBJECT)).toThrow();
    expect(() => buildImageObjectPath(FOLDER, "exe", OBJECT)).toThrow();
    expect(() => buildImageObjectPath(FOLDER, "jpg", "../../x")).toThrow();
  });
});
