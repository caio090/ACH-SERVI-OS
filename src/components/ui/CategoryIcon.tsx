import type { CategoryRow } from "@/lib/database.types";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Icon } from "@/components/ui/Icon";

/** Ícone da categoria na biblioteca do app (o emoji salvo no banco não é exibido). */
export function CategoryIcon({ category, className }: { category: Pick<CategoryRow, "name" | "slug">; className?: string }) {
  return <Icon name={getCategoryIcon(category)} className={className} />;
}
