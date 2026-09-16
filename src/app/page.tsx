import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { BRAND_TAGLINE } from "@/lib/constants";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{BRAND_TAGLINE}</h1>
        <p className="max-w-md text-sm text-brand-50">
          Encontre profissionais de confiança perto de você. Descreva o que precisa, escolha um
          horário e pronto.
        </p>
        <form action="/buscar" className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="q"
            placeholder="O que você precisa? Ex.: eletricista"
            className="w-full rounded-xl border-0 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Buscar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Categorias</h2>

        {error && (
          <EmptyState
            icon="⚠️"
            title="Não foi possível carregar as categorias"
            description="Verifique se as variáveis de ambiente do Supabase estão configuradas."
          />
        )}

        {!error && categories && categories.length === 0 && (
          <EmptyState icon="🗂️" title="Nenhuma categoria cadastrada ainda" />
        )}

        {!error && categories && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((category) => (
              <Link key={category.id} href={`/buscar?categoria=${category.slug}`}>
                <Card className="flex h-full flex-col items-center justify-center gap-2 text-center hover:border-brand-300 hover:shadow-md">
                  <span className="text-2xl" aria-hidden="true">
                    {category.icon}
                  </span>
                  <span className="text-sm font-medium text-neutral-800">{category.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <span className="text-2xl" aria-hidden="true">
            🙋
          </span>
          <h3 className="font-bold text-neutral-900">Precisa de um serviço?</h3>
          <p className="text-sm text-neutral-600">
            Crie um pedido em poucos passos e receba respostas de profissionais disponíveis.
          </p>
          <Link href="/pedidos/novo" className="text-sm font-semibold text-brand-600 hover:underline">
            Criar pedido →
          </Link>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-2xl" aria-hidden="true">
            🧰
          </span>
          <h3 className="font-bold text-neutral-900">É profissional?</h3>
          <p className="text-sm text-neutral-600">
            Cadastre suas categorias, regiões e agenda para começar a receber pedidos.
          </p>
          <Link href="/pro/onboarding" className="text-sm font-semibold text-brand-600 hover:underline">
            Criar perfil profissional →
          </Link>
        </Card>
      </section>
    </div>
  );
}
