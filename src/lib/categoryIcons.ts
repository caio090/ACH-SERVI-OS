import type { IconName } from "@/components/ui/Icon";
import type { CategoryRow } from "@/lib/database.types";

/** Remove acentos e padroniza caixa para comparar textos em português. */
export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Ícone da biblioteca do app para uma categoria. O campo `icon` do banco guarda
 * emoji (seed original) e não é usado na interface; o ícone é derivado de
 * slug/nome para manter um conjunto visual consistente.
 */
const ICON_RULES: Array<[RegExp, IconName]> = [
  [/eletric/, "bolt"],
  [/encan|hidraul/, "droplet"],
  [/refrigera|ar-condicionado|climat/, "snowflake"],
  [/pedreir|alvenaria/, "brick"],
  [/pint/, "paint"],
  [/faz-tudo|servicos-gerais/, "hammer"],
  [/montador|moveis/, "wrench"],
  [/chaveir/, "key"],
  [/mecanic|socorro/, "car"],
  [/eletrodomestic/, "plug"],
  [/diarista|limpeza|manicure|pedicure/, "sparkles"],
  [/jardin/, "leaf"],
  [/cabelei|barbei|costur|ajustes/, "scissors"],
];

export function getCategoryIcon(category: Pick<CategoryRow, "name" | "slug">): IconName {
  const value = normalizeSearchText(`${category.slug} ${category.name}`);
  return ICON_RULES.find(([pattern]) => pattern.test(value))?.[1] ?? "briefcase";
}
