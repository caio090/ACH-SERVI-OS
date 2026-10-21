import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CategoryRow } from "@/lib/database.types";
import { getCategoryIcon } from "./categoryIcons";
import { searchServiceCategories } from "./serviceSearch";

// As 15 categorias reais do seed (0006), lidas da própria migration.
const seedSql = readFileSync(path.resolve(__dirname, "../../supabase/migrations/0006_seed_categories.sql"), "utf8");
const SEED: CategoryRow[] = Array.from(seedSql.matchAll(/\('([a-z-]+)', '([^']+)', '[^']*', (\d+)\)/g), (match) => ({
  id: match[1],
  slug: match[1],
  name: match[2],
  icon: "",
  is_active: true,
  sort_order: Number(match[3]),
  created_at: "",
}));

const slugs = (query: string) => searchServiceCategories(query, SEED).map((result) => result.category.slug);

describe("busca de serviço", () => {
  it("lê as 15 categorias do seed", () => {
    expect(SEED).toHaveLength(15);
  });

  it("sem termo, devolve todas as categorias na ordem recebida", () => {
    expect(slugs("")).toEqual(SEED.map((category) => category.slug));
  });

  it("encontra pelo nome ignorando acentos e caixa", () => {
    expect(slugs("ELETRICISTA")).toEqual(["eletricista"]);
    expect(slugs("refrigeracao")).toContain("refrigeracao-ar-condicionado");
  });

  it("encontra pelo problema que o cliente quer resolver", () => {
    expect(slugs("tomada")).toEqual(["eletricista"]);
    expect(slugs("vazamento na pia")).toContain("encanador");
    expect(slugs("geladeira")).toEqual(expect.arrayContaining(["refrigeracao-ar-condicionado", "tecnico-eletrodomesticos"]));
    const result = searchServiceCategories("fechadura", SEED)[0];
    expect(result).toMatchObject({ category: { slug: "chaveiro" }, matchedKeyword: "fechadura" });
  });

  it("resultados pelo nome vêm antes dos relacionados por problema", () => {
    expect(slugs("pint")[0]).toBe("pintor");
  });

  it("termo sem relação não inventa resultado", () => {
    expect(slugs("xyzabc")).toEqual([]);
  });
});

describe("ícones de categoria", () => {
  it("toda categoria do seed tem ícone próprio (sem cair no genérico)", () => {
    for (const category of SEED) {
      expect(getCategoryIcon(category), category.slug).not.toBe("briefcase");
    }
  });

  it("categoria nova desconhecida usa o ícone genérico", () => {
    expect(getCategoryIcon({ name: "Fotógrafo", slug: "fotografo" })).toBe("briefcase");
  });
});
