import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: totalProfessionals },
    { count: openRequests },
    { count: completedRequests },
    { count: totalReviews },
    { count: openReports },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("professional_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "reviewing", "accepted", "scheduled", "in_service"]),
    supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const metrics = [
    { label: "Usuários", value: totalUsers ?? 0, icon: "👥" },
    { label: "Profissionais", value: totalProfessionals ?? 0, icon: "🧰" },
    { label: "Pedidos em andamento", value: openRequests ?? 0, icon: "📋" },
    { label: "Pedidos concluídos", value: completedRequests ?? 0, icon: "✅" },
    { label: "Avaliações", value: totalReviews ?? 0, icon: "⭐" },
    { label: "Denúncias abertas", value: openReports ?? 0, icon: "🚩" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Métricas</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="flex flex-col gap-1">
            <span className="text-xl" aria-hidden="true">
              {metric.icon}
            </span>
            <span className="text-2xl font-bold text-neutral-900">{metric.value}</span>
            <span className="text-xs text-neutral-500">{metric.label}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
