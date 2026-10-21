import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { CategoryToggle } from "./CategoryToggle";
import { NewCategoryForm } from "./NewCategoryForm";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .returns<CategoryRow[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Categorias</h1>
      <NewCategoryForm />
      <div className="flex flex-col gap-2">
        {categories?.map((category) => (
          <Card key={category.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-neutral-900">
              {category.icon} {category.name}
            </span>
            <CategoryToggle categoryId={category.id} isActive={category.is_active} />
          </Card>
        ))}
      </div>
    </div>
  );
}
