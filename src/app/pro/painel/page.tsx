import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, RequestMatchRow, ServiceRequestRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { REQUEST_MATCH_STATUS_LABELS } from "@/lib/constants";

type MatchWithRequest = RequestMatchRow & {
  service_requests: (ServiceRequestRow & { categories: Pick<CategoryRow, "name" | "icon"> | null }) | null;
};

export default async function ProfessionalDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirect=/pro/painel");
  }

  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  if (!professional) {
    redirect("/pro/onboarding");
  }

  const { data: matches } = await supabase
    .from("request_matches")
    .select("*, service_requests(*, categories(name, icon))")
    .eq("professional_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<MatchWithRequest[]>();

  const pending = matches?.filter((m) => m.status === "pending") ?? [];
  const others = matches?.filter((m) => m.status !== "pending") ?? [];

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Pedidos recebidos</h1>
        <Link href="/pro/agenda" className="text-sm font-semibold text-brand-600 hover:underline">
          Ver agenda →
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Aguardando sua resposta
        </h2>
        {pending.length === 0 && <EmptyState icon="📭" title="Nenhum pedido novo no momento" />}
        {pending.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </section>

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Histórico</h2>
          {others.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithRequest }) {
  const request = match.service_requests;
  if (!request) return null;

  return (
    <Link href={`/pro/pedidos/${match.id}`}>
      <Card className="flex flex-col gap-2 hover:border-brand-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              {request.categories?.icon ?? "🛠️"}
            </span>
            <div>
              <p className="font-semibold text-neutral-900">{request.categories?.name ?? "Serviço"}</p>
              <p className="text-xs text-neutral-500">
                {request.neighborhood} ·{" "}
                {new Date(`${request.desired_date}T00:00:00`).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <Badge
            tone={
              match.status === "accepted"
                ? "success"
                : match.status === "declined"
                  ? "danger"
                  : match.status === "proposed_new_time"
                    ? "warning"
                    : "brand"
            }
          >
            {REQUEST_MATCH_STATUS_LABELS[match.status]}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm text-neutral-600">{request.description}</p>
        {request.is_urgent && <span className="w-fit text-xs font-semibold text-brand-600">⚡ Urgente</span>}
      </Card>
    </Link>
  );
}
