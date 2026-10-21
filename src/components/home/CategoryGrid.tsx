import Link from "next/link";
import type { CategoryRow } from "@/lib/database.types";
import { Icon } from "@/components/ui/Icon";
import { getCategoryIcon } from "@/lib/categoryIcons";

export function CategoryGrid({
  categories,
  unavailable = false,
  hasError = false,
}: {
  categories: CategoryRow[] | null;
  unavailable?: boolean;
  hasError?: boolean;
}) {
  if ((unavailable && (!categories || categories.length === 0)) || hasError) {
    return (
      <div className="space-y-3">
        <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-20 w-[8.5rem] shrink-0 animate-pulse flex-col items-start justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 sm:min-h-16 sm:w-auto sm:flex-row sm:items-center sm:justify-start sm:gap-3"
              aria-hidden="true"
            >
              <span className="h-9 w-9 shrink-0 rounded-lg bg-neutral-100" />
              <span className="h-3 w-20 max-w-[55%] rounded bg-neutral-100" />
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500" role="status">
          {unavailable
            ? "Categorias temporariamente indisponíveis nesta visualização."
            : "Não foi possível carregar as categorias agora."}
        </p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-6 text-center">
        <p className="text-sm font-medium text-neutral-700">Nenhuma categoria disponível.</p>
      </div>
    );
  }

  const visibleCategories = categories.slice(0, 6);

  return (
    <>
      <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {visibleCategories.map((category) => (
          <Link
            key={category.id}
            href={`/pedir?categoria=${category.slug}`}
            className="group flex min-h-20 w-[8.5rem] shrink-0 flex-col items-start justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-action-300 hover:bg-action-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 sm:min-h-16 sm:w-auto sm:flex-row sm:items-center sm:justify-start sm:gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action-50 text-action-700 transition-colors group-hover:bg-white">
              <Icon name={getCategoryIcon(category)} className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm font-semibold leading-tight text-neutral-800">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
      {unavailable && (
        <p className="mt-2 text-xs text-neutral-500" role="status">
          Categorias demonstrativas para visualização local.
        </p>
      )}
    </>
  );
}
