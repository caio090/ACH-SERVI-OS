import Link from "next/link";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/server";
import {
  allowMissingSupabaseForVisualPreview,
  assertSupabaseConfigOutsideVisualPreview,
  hasPublicSupabaseConfig,
} from "@/lib/supabase/config";
import type { CategoryRow, ServiceRequestRow } from "@/lib/database.types";
import { SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { PREVIEW_REQUEST_CATEGORIES } from "@/lib/request-flow";

type HomeRequest = Pick<ServiceRequestRow, "id" | "description" | "status"> & {
  categories: Pick<CategoryRow, "name" | "slug"> | null;
};

async function loadHomeData() {
  if (!hasPublicSupabaseConfig()) {
    assertSupabaseConfigOutsideVisualPreview();

    return {
      categories: PREVIEW_REQUEST_CATEGORIES,
      categoryError: false,
      requests: null,
      isVisualPreview: allowMissingSupabaseForVisualPreview(),
    };
  }

  const supabase = await createClient();
  const [categoriesResult, userResult] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .returns<CategoryRow[]>(),
    supabase.auth.getUser(),
  ]);

  let requests: HomeRequest[] | null = [];

  if (userResult.data.user) {
    const requestsResult = await supabase
      .from("service_requests")
      .select("id, description, status, categories(name, slug)")
      .eq("client_id", userResult.data.user.id)
      .not("status", "in", '("completed","cancelled","expired")')
      .order("created_at", { ascending: false })
      .limit(2)
      .returns<HomeRequest[]>();

    requests = requestsResult.error ? null : requestsResult.data;
  }

  return {
    categories: categoriesResult.data,
    categoryError: Boolean(categoriesResult.error),
    requests,
    isVisualPreview: false,
  };
}

export default async function HomePage() {
  const { categories, categoryError, requests, isVisualPreview } = await loadHomeData();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-2 md:gap-8 md:pt-3">
      <section aria-labelledby="home-heading" className="space-y-4 md:max-w-3xl">
        <div>
          <p className="text-sm font-semibold text-action-700">Olá!</p>
          <h1
            id="home-heading"
            className="mt-1 text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-950 sm:text-3xl"
          >
            O que você precisa hoje?
          </h1>
        </div>

        <form action="/pedir" className="relative flex items-center" role="search">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 h-5 w-5 text-neutral-400"
          />
          <input
            type="search"
            name="q"
            aria-label="Buscar serviço"
            placeholder="Qual serviço você procura?"
            className="h-14 w-full rounded-xl border border-neutral-300 bg-white pl-12 pr-16 text-base text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-action-500 focus:ring-4 focus:ring-action-100"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute right-1.5 flex h-11 w-11 items-center justify-center rounded-lg bg-action-600 text-white transition-colors hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2"
          >
            <Icon name="arrow-right" className="h-5 w-5" />
          </button>
        </form>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] lg:gap-8">
        <section aria-labelledby="categories-heading" className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="categories-heading" className="text-lg font-bold text-neutral-950">
                Categorias
              </h2>
              <p className="mt-0.5 text-sm text-neutral-500">Encontre o serviço certo mais rápido.</p>
            </div>
            <Link
              href="/pedir"
              className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold text-action-700 hover:text-action-800"
            >
              Ver todos
              <Icon name="chevron-right" className="h-4 w-4" />
            </Link>
          </div>

          <CategoryGrid
            categories={categories}
            unavailable={isVisualPreview}
            hasError={categoryError}
          />
        </section>

        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="request-heading"
            className="relative overflow-hidden rounded-2xl bg-action-700 px-5 py-5 text-white sm:px-6"
          >
            <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[22px] border-white/10" />
            <div className="relative">
              <span className="mb-3 block h-1 w-10 rounded-full bg-accent-400" />
              <h2 id="request-heading" className="text-xl font-bold">
                Precisa resolver algo?
              </h2>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-action-100">
                Conte o que aconteceu e encontre profissionais disponíveis.
              </p>
              <Link
                href="/pedir"
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-action-800 transition-colors hover:bg-action-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-action-700"
              >
                Pedir serviço
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section aria-labelledby="orders-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="orders-heading" className="text-lg font-bold text-neutral-950">
                Meus pedidos
              </h2>
              <Link href="/pedidos" className="text-sm font-semibold text-action-700 hover:text-action-800">
                Ver pedidos
              </Link>
            </div>

            {requests && requests.length > 0 ? (
              <div className="space-y-2.5">
                {requests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/pedidos/${request.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 transition-colors hover:border-action-300"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action-50 text-action-700">
                      <Icon name="clipboard" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-900">
                        {request.categories?.name ?? "Serviço"}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {SERVICE_REQUEST_STATUS_LABELS[request.status]}
                      </span>
                    </span>
                    <Icon name="chevron-right" className="h-4 w-4 text-neutral-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <Icon name="clipboard" className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-neutral-900">
                  {requests === null
                    ? "Nenhum pedido para mostrar nesta visualização."
                    : "Você ainda não tem pedidos em andamento."}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  Faça seu primeiro pedido e acompanhe tudo por aqui.
                </p>
                <Link
                  href="/pedir"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-action-200 px-4 py-2.5 text-sm font-bold text-action-700 transition-colors hover:bg-action-50"
                >
                  Fazer primeiro pedido
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
