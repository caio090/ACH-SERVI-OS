import { createClient } from "@/lib/supabase/server";
import type { BetaReadinessItemRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadinessSummaryBar } from "@/components/admin/ReadinessSummaryBar";
import { READINESS_CATEGORIES, READINESS_CATEGORY_LABELS, summarizeReadiness } from "@/lib/betaReadiness";
import { ReadinessItemForm } from "./ReadinessItemForm";

export default async function BetaReadinessPage() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("beta_readiness_items")
    .select("*")
    .order("sort_order")
    .returns<BetaReadinessItemRow[]>();

  if (error) {
    return (
      <EmptyState
        icon="🧭"
        title="Checklist indisponível"
        description="Aplique a migration 0020_beta_readiness.sql no Supabase para habilitar esta seção."
      />
    );
  }

  const all = items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Prontidão do Beta</h1>
        <p className="text-sm text-neutral-600">Progresso calculado só a partir dos itens marcados como concluídos.</p>
      </div>

      <Card>
        <ReadinessSummaryBar summary={summarizeReadiness(all)} />
      </Card>

      {READINESS_CATEGORIES.map((category) => {
        const group = all.filter((item) => item.category === category);
        if (group.length === 0) return null;
        const summary = summarizeReadiness(group);
        return (
          <section key={category} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{READINESS_CATEGORY_LABELS[category]}</h2>
              <span className="text-xs text-neutral-500">
                {summary.counts.done}/{summary.total} concluídos
              </span>
            </div>
            {group.map((item) => (
              <Card key={item.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                <ReadinessItemForm id={item.id} status={item.status} notes={item.notes} />
                <p className="text-xs text-neutral-400">
                  Atualizado em {new Date(item.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}
