import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import type { CategoryRow, ServiceRequestRow } from "@/lib/database.types";
import { getRequestStatusTone, isRequestTerminal } from "@/lib/request-status";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type RequestWithCategory = ServiceRequestRow & {
  categories: Pick<CategoryRow, "name" | "slug"> | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatUpdate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function RequestCard({ request }: { request: RequestWithCategory }) {
  return (
    <Link href={`/pedidos/${request.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2">
      <Card className="transition-colors hover:border-action-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-action-50 text-action-700" aria-hidden="true">
              <Icon name={request.categories ? getCategoryIcon(request.categories) : "briefcase"} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-neutral-900">{request.categories?.name ?? "Serviço"}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                <Icon name="map-pin" className="h-3.5 w-3.5" />
                {request.neighborhood}, {request.city}
              </p>
            </div>
          </div>
          <Badge tone={getRequestStatusTone(request.status)}>
            {SERVICE_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600">{request.description}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          <span>Desejado: {formatDate(request.desired_date)}</span>
          <span>Atualizado em {formatUpdate(request.updated_at)}</span>
        </div>
      </Card>
    </Link>
  );
}

function EmptyRequests() {
  return (
    <EmptyState
      icon="📋"
      title="Você ainda não fez nenhum pedido"
      description="Conte o que precisa e encontre profissionais que atendem sua região."
      action={
        <Link
          href="/pedir"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-action-800"
        >
          Fazer primeiro pedido
        </Link>
      }
    />
  );
}

export default async function MyRequestsPage({ searchParams }: { searchParams: { aba?: string } }) {
  if (!hasPublicSupabaseConfig()) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-action-700">Acompanhamento</p>
            <h1 className="text-2xl font-bold text-neutral-950">Meus pedidos</h1>
          </div>
          <Link href="/pedir" className="rounded-xl bg-action-700 px-4 py-2.5 text-sm font-bold text-white">
            Novo pedido
          </Link>
        </div>
        <Alert tone="error">
          Os pedidos reais não podem ser carregados neste ambiente porque as variáveis públicas do Supabase não estão configuradas.
        </Alert>
        <EmptyRequests />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        icon="🔒"
        title="Entre para ver seus pedidos"
        action={
          <Link
            href="/entrar?redirect=/pedidos"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action-700 px-4 py-2.5 text-sm font-bold text-white"
          >
            Entrar
          </Link>
        }
      />
    );
  }

  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("*, categories(name, slug)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .returns<RequestWithCategory[]>();

  const active = (requests ?? []).filter((request) => !isRequestTerminal(request.status));
  // "Concluídos" reúne pedidos encerrados: concluído, cancelado ou expirado (o selo mostra qual).
  const finished = (requests ?? []).filter((request) => isRequestTerminal(request.status));
  const tab: RequestsTab = searchParams.aba === "concluidos" ? "concluidos" : "andamento";
  const shown = tab === "andamento" ? active : finished;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-action-700">Acompanhamento</p>
          <h1 className="text-2xl font-bold text-neutral-950">Meus pedidos</h1>
        </div>
        <Link href="/pedir" className="rounded-xl bg-action-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-action-800">
          Novo pedido
        </Link>
      </div>

      {error && <Alert tone="error">Não foi possível carregar seus pedidos agora.</Alert>}

      {!error && requests?.length === 0 ? (
        <EmptyRequests />
      ) : (
        <>
          <RequestsTabs current={tab} activeCount={active.length} finishedCount={finished.length} />
          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-600">
              {tab === "andamento" ? "Nenhum pedido em andamento agora." : "Nenhum pedido concluído ainda."}
            </p>
          ) : (
            <div className="space-y-3">
              {shown.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type RequestsTab = "andamento" | "concluidos";

function RequestsTabs({ current, activeCount, finishedCount }: { current: RequestsTab; activeCount: number; finishedCount: number }) {
  const tabs: Array<{ id: RequestsTab; label: string; count: number; href: string }> = [
    { id: "andamento", label: "Em andamento", count: activeCount, href: "/pedidos" },
    { id: "concluidos", label: "Concluídos", count: finishedCount, href: "/pedidos?aba=concluidos" },
  ];
  return (
    <nav aria-label="Filtrar pedidos" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
      {tabs.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === current ? "page" : undefined}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
            item.id === current ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {item.label}
          <span className="rounded-full bg-neutral-200 px-1.5 text-[11px] tabular-nums text-neutral-700">{item.count}</span>
        </Link>
      ))}
    </nav>
  );
}
