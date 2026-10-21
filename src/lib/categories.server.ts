import "server-only";
import type { CategoryRow } from "@/lib/database.types";
import { PREVIEW_REQUEST_CATEGORIES } from "@/lib/request-flow";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Categorias ativas do Supabase, na ordem definida pelo admin. Sem as
 * variáveis do Supabase (pré-visualização local) devolve as categorias de
 * demonstração e sinaliza `isPreview` para a interface avisar.
 */
export async function loadActiveCategories(): Promise<{ categories: CategoryRow[]; isPreview: boolean; hasError: boolean }> {
  if (!hasPublicSupabaseConfig()) {
    return { categories: PREVIEW_REQUEST_CATEGORIES, isPreview: true, hasError: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  return { categories: error ? [] : (data ?? []), isPreview: false, hasError: Boolean(error) };
}
