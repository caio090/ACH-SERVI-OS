import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioItemRow } from "@/lib/database.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddPortfolioItemForm } from "./AddPortfolioItemForm";
import { DeletePortfolioButton } from "./DeletePortfolioButton";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirect=/pro/portfolio");
  }

  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  if (!professional) {
    redirect("/pro/onboarding");
  }

  const { data: items } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("professional_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<PortfolioItemRow[]>();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <h1 className="text-2xl font-bold text-neutral-900">Portfólio</h1>

      <AddPortfolioItemForm />

      {(!items || items.length === 0) && (
        <EmptyState icon="🖼️" title="Nenhuma foto no portfólio ainda" description="Adicione fotos dos seus trabalhos." />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items?.map((item) => (
          <div key={item.id} className="relative overflow-hidden rounded-xl border border-neutral-200">
            {supabaseUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${supabaseUrl}/storage/v1/object/public/portfolio/${item.photo_path}`}
                alt={item.title || "Foto do portfólio"}
                className="aspect-square w-full object-cover"
              />
            )}
            <DeletePortfolioButton id={item.id} />
            {item.title && <p className="p-2 text-xs font-medium text-neutral-700">{item.title}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
