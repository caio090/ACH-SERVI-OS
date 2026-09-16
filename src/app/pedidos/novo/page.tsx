import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/database.types";
import { NewRequestForm } from "./NewRequestForm";

export default async function NewRequestPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Criar pedido</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Descreva o que você precisa. Profissionais compatíveis vão poder aceitar ou sugerir outro
          horário.
        </p>
      </div>
      <NewRequestForm categories={categories ?? []} />
    </div>
  );
}
