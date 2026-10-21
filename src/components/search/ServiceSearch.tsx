"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryRow } from "@/lib/database.types";
import { Icon } from "@/components/ui/Icon";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { searchServiceCategories } from "@/lib/serviceSearch";
import { trackClientEvent } from "@/lib/analytics.client";

function requestHref(category: CategoryRow, query: string) {
  const params = new URLSearchParams({ categoria: category.slug });
  if (query.trim()) params.set("q", query.trim());
  return `/pedir?${params.toString()}`;
}

/**
 * Busca do TIPO DE SERVIÇO: o cliente diz o que precisa resolver e escolhe a
 * categoria; o pedido segue no wizard (/pedir) já com a categoria marcada.
 */
export function ServiceSearch({ categories, initialQuery }: { categories: CategoryRow[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const trackedSearch = useRef(false);
  const results = useMemo(() => searchServiceCategories(query, categories), [query, categories]);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (hasQuery && !trackedSearch.current) {
      trackedSearch.current = true;
      trackClientEvent("search_started", { has_query: true });
    }
  }, [hasQuery]);

  return (
    <div className="flex flex-col gap-5">
      <form
        role="search"
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          const first = results[0];
          if (hasQuery && first) window.location.assign(requestHref(first.category, query));
        }}
      >
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: tomada queimada, vazamento, montar armário"
          aria-label="O que você precisa resolver?"
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-14 w-full rounded-2xl border border-neutral-300 bg-white pl-12 pr-4 text-base text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-action-500 focus:outline-none focus:ring-2 focus:ring-action-100"
        />
      </form>

      <section aria-live="polite" aria-labelledby="search-results-heading" className="flex flex-col gap-3">
        <h2 id="search-results-heading" className="text-sm font-bold text-neutral-700">
          {hasQuery
            ? results.length > 0
              ? `${results.length} tipo${results.length === 1 ? "" : "s"} de serviço para “${query.trim()}”`
              : `Nenhuma categoria para “${query.trim()}”`
            : "Todas as categorias"}
        </h2>

        {results.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.map(({ category, matchedKeyword }) => (
              <li key={category.id}>
                <Link
                  href={requestHref(category, query)}
                  onClick={() => trackClientEvent("category_selected", { category_slug: category.slug })}
                  className="group flex min-h-16 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-action-300 hover:bg-action-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-50 text-action-700 group-hover:bg-white">
                    <Icon name={getCategoryIcon(category)} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-neutral-900">{category.name}</span>
                    {matchedKeyword && (
                      <span className="block truncate text-xs text-neutral-500">Relacionado a “{matchedKeyword}”</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-action-700">Pedir</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {hasQuery && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
            <p>Não encontramos uma categoria com esse termo. Tente uma palavra mais simples, como “tomada” ou “vazamento”.</p>
            <Link href="/pedir" className="mt-3 inline-flex font-semibold text-action-700 hover:underline">
              Ver todas as categorias no pedido →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
