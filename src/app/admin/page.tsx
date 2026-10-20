import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BetaReadinessItemRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { ReadinessSummaryBar } from "@/components/admin/ReadinessSummaryBar";
import { summarizeReadiness } from "@/lib/betaReadiness";
import { buildFunnel, type FunnelCounts } from "@/lib/analytics";

const FUNNEL_DAYS = 30;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - FUNNEL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [metricsResult, funnelResult, readinessResult, openReportsResult] = await Promise.all([
    supabase.rpc("admin_beta_metrics"),
    supabase.rpc("admin_product_funnel", { p_since: since }),
    supabase.from("beta_readiness_items").select("category, status").returns<Pick<BetaReadinessItemRow, "category" | "status">[]>(),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const metrics = metricsResult.data?.[0];
  const pilotCards = metrics
    ? [
        { label: "Clientes cadastrados", value: metrics.clients_registered },
        { label: "Profissionais cadastrados", value: metrics.professionals_registered },
        { label: "Profissionais verificados", value: metrics.professionals_verified },
        { label: "Pedidos abertos", value: metrics.requests_open },
        { label: "Pedidos com match", value: metrics.requests_with_match },
        { label: "Agendamentos", value: metrics.appointments_total },
        { label: "Serviços concluídos", value: metrics.services_completed },
        { label: "Avaliações", value: metrics.reviews_total },
        { label: "Denúncias abertas", value: openReportsResult.count ?? 0 },
      ]
    : null;

  const funnelCounts: FunnelCounts = {};
  for (const row of funnelResult.data ?? []) {
    funnelCounts[row.event_name as keyof FunnelCounts] = Number(row.actors);
  }
  const funnel = buildFunnel(funnelCounts);
  const hasFunnelData = funnel.some((step) => step.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-neutral-900">Painel</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Operação do piloto</h2>
        {pilotCards ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pilotCards.map((card) => (
              <Card key={card.label} className="flex flex-col gap-1">
                <span className="text-2xl font-bold tabular-nums text-neutral-900">{card.value}</span>
                <span className="text-xs text-neutral-500">{card.label}</span>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Métricas indisponíveis — aplique a migration 0020_beta_readiness.sql no Supabase.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Funil — últimos {FUNNEL_DAYS} dias</h2>
          <p className="text-xs text-neutral-500">Pessoas distintas (conta ou navegador) que passaram por cada etapa.</p>
        </div>
        {funnelResult.error ? (
          <p className="text-sm text-neutral-500">Funil indisponível — aplique a migration 0019_product_events.sql.</p>
        ) : !hasFunnelData ? (
          <p className="text-sm text-neutral-500">Nenhum evento registrado no período ainda.</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Etapa</th>
                  <th className="px-3 py-2 text-right font-medium">Pessoas</th>
                  <th className="px-3 py-2 text-right font-medium">vs. anterior</th>
                  <th className="px-3 py-2 text-right font-medium">vs. visita</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((step) => (
                  <tr key={step.event} className="border-t border-neutral-100">
                    <td className="px-3 py-2 text-neutral-800">{step.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{step.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {step.fromPrevious === null ? "—" : `${step.fromPrevious}%`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {step.fromStart === null ? "—" : `${step.fromStart}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Prontidão do Beta</h2>
          <Link href="/admin/prontidao" className="text-sm font-semibold text-brand-600 hover:underline">
            Ver checklist →
          </Link>
        </div>
        <Card>
          {readinessResult.error ? (
            <p className="text-sm text-neutral-500">Checklist indisponível — aplique a migration 0020_beta_readiness.sql.</p>
          ) : (
            <ReadinessSummaryBar summary={summarizeReadiness(readinessResult.data ?? [])} />
          )}
        </Card>
      </section>
    </div>
  );
}
