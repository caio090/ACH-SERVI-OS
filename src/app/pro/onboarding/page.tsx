import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/database.types";
import { ProfessionalProfileForm } from "../ProfessionalProfileForm";

export default async function ProfessionalOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirect=/pro/onboarding");
  }

  const { data: existing } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  if (existing) {
    redirect("/pro/perfil");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Criar perfil profissional</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Escolha suas categorias e regiões atendidas para começar a receber pedidos.
        </p>
      </div>
      <ProfessionalProfileForm categories={categories ?? []} redirectTo="/pro/agenda" />
    </div>
  );
}
