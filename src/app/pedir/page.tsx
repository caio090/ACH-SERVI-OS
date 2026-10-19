import type { CategoryRow } from "@/lib/database.types";
import { RequestWizard } from "@/components/requests/RequestWizard";
import { PREVIEW_REQUEST_CATEGORIES } from "@/lib/request-flow";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function loadCategories() {
  if (!hasPublicSupabaseConfig()) {
    return { categories: PREVIEW_REQUEST_CATEGORIES, isPreview: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  return { categories: error ? [] : (data ?? []), isPreview: false };
}

export default async function RequestWizardPage({
  searchParams,
}: {
  searchParams: { categoria?: string; q?: string };
}) {
  const { categories, isPreview } = await loadCategories();

  return (
    <div className="py-2 sm:py-5">
      <RequestWizard
        categories={categories}
        initialCategorySlug={searchParams.categoria}
        initialQuery={searchParams.q}
        canPersist={hasPublicSupabaseConfig()}
        isPreview={isPreview}
      />
    </div>
  );
}
