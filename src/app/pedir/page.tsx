import { RequestWizard } from "@/components/requests/RequestWizard";
import { loadActiveCategories } from "@/lib/categories.server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";

export default async function RequestWizardPage({
  searchParams,
}: {
  searchParams: { categoria?: string; q?: string };
}) {
  const { categories, isPreview } = await loadActiveCategories();

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
