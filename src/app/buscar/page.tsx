import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, PublicProfessionalProfileRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/Field";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string; bairro?: string };
}) {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  const selectedCategory = categories?.find((c) => c.slug === searchParams.categoria);

  // A view pública não tem FK real para professional_categories, então o
  // PostgREST não consegue fazer embedding direto — resolvemos em duas
  // consultas e cruzamos os ids em memória.
  let professionalIds: string[] | null = null;
  if (selectedCategory) {
    const { data: links } = await supabase
      .from("professional_categories")
      .select("professional_id")
      .eq("category_id", selectedCategory.id);
    professionalIds = (links ?? []).map((link) => link.professional_id);
  }

  let query = supabase
    .from("public_professional_profiles")
    .select("*")
    .order("average_rating", { ascending: false })
    .limit(50);

  if (professionalIds) {
    query = query.in("id", professionalIds.length > 0 ? professionalIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: professionals } = await query.returns<PublicProfessionalProfileRow[]>();

  const bairro = searchParams.bairro?.trim().toLowerCase();
  const q = searchParams.q?.trim().toLowerCase();

  const filtered = professionals?.filter((p) => {
    const matchesBairro = !bairro || p.service_areas.some((area) => area.toLowerCase().includes(bairro));
    const matchesText = !q || p.full_name.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q);
    return matchesBairro && matchesText;
  });

  const filteredByText = filtered;

  return (
    <div className="flex flex-col gap-5 py-4">
      <h1 className="text-2xl font-bold text-neutral-900">Buscar profissionais</h1>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" method="get">
        <SelectField id="categoria" name="categoria" label="Categoria" defaultValue={searchParams.categoria ?? ""}>
          <option value="">Todas as categorias</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.icon} {category.name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-medium text-neutral-800">
            Buscar por nome
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              defaultValue={searchParams.q}
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {(!filteredByText || filteredByText.length === 0) && (
        <EmptyState
          icon="🔎"
          title="Nenhum profissional encontrado"
          description="Tente outra categoria ou remova os filtros."
        />
      )}

      <div className="flex flex-col gap-3">
        {filteredByText?.map((professional) => (
          <Link key={professional.id} href={`/profissional/${professional.id}`}>
            <Card className="flex items-center gap-3 hover:border-brand-300 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600">
                {professional.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">{professional.full_name}</p>
                <p className="text-xs text-neutral-500">
                  {professional.city}
                  {professional.neighborhood ? ` · ${professional.neighborhood}` : ""}
                </p>
                <p className="text-xs text-neutral-500">
                  ⭐ {professional.average_rating.toFixed(1)} ({professional.review_count} avaliações)
                </p>
              </div>
              {professional.is_verified && <span title="Verificado">✅</span>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
