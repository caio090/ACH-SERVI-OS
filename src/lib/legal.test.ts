import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPrivacyPolicy, getTermsOfUse, LEGAL_REVIEW_NOTICE, LEGAL_VERSION } from "./legal";

const text = (doc: ReturnType<typeof getTermsOfUse>) =>
  doc.sections.map((section) => `${section.title} ${section.paragraphs.join(" ")}`).join(" ").toLowerCase();

describe("documentos legais", () => {
  it("Termos cobrem os tópicos mínimos do beta", () => {
    const ids = getTermsOfUse().sections.map((section) => section.id);
    expect(ids).toEqual(
      expect.arrayContaining(["natureza", "partes", "responsabilidade", "conduta", "suspensao", "avaliacoes", "comunicacao", "limitacoes", "alteracoes"]),
    );
  });

  it("Privacidade cobre os tópicos mínimos de LGPD", () => {
    const ids = getPrivacyPolicy().sections.map((section) => section.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "dados",
        "finalidade",
        "autenticacao",
        "localizacao",
        "mensagens",
        "fotos",
        "retencao",
        "compartilhamento",
        "direitos",
        "contato",
        "cookies",
      ]),
    );
    expect(text(getPrivacyPolicy())).toContain("lgpd");
  });

  it("ids de seção são únicos (âncoras do índice)", () => {
    for (const doc of [getTermsOfUse(), getPrivacyPolicy()]) {
      const ids = doc.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("deixa explícito o que ainda está pendente em vez de inventar dados", () => {
    expect(LEGAL_REVIEW_NOTICE).toMatch(/revisão jurídica/);
    expect(text(getTermsOfUse())).toContain("[pendente: razão social e cnpj");
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("as rotas /termos e /privacidade existem", () => {
    const appDir = path.resolve(__dirname, "../app");
    expect(existsSync(path.join(appDir, "termos/page.tsx"))).toBe(true);
    expect(existsSync(path.join(appDir, "privacidade/page.tsx"))).toBe(true);
  });
});
