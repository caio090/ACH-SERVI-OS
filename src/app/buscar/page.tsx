import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { ServiceSearch } from "@/components/search/ServiceSearch";
import { loadActiveCategories } from "@/lib/categories.server";

export const metadata: Metadata = { title: "Buscar serviço" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const { categories, isPreview, hasError } = await loadActiveCategories();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-2 sm:py-5">
      <div>
        <p className="text-sm font-semibold text-action-700">Buscar</p>
        <h1 className="text-2xl font-bold text-neutral-950">O que você precisa resolver?</h1>
        <p className="mt-1 text-sm text-neutral-600">Descreva o problema ou escolha o tipo de serviço. Depois a gente conecta você aos profissionais.</p>
      </div>

      {hasError && <Alert tone="error">Não foi possível carregar as categorias agora. Tente novamente em instantes.</Alert>}
      {isPreview && (
        <p className="text-xs text-neutral-500" role="status">
          Categorias demonstrativas para visualização local.
        </p>
      )}

      <ServiceSearch categories={categories} initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
