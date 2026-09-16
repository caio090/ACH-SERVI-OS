import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, ServiceRequestRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";

type RequestWithCategory = ServiceRequestRow & { categories: Pick<CategoryRow, "name" | "icon"> | null };

const statusTone: Record<string, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  open: "brand",
  reviewing: "warning",
  accepted: "warning",
  scheduled: "success",
  in_service: "success",
  completed: "neutral",
  cancelled: "danger",
  expired: "danger",
};

export default async function MyRequestsPage() {
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
          <Link href="/entrar?redirect=/pedidos">
            <Button>Entrar</Button>
          </Link>
        }
      />
    );
  }

  const { data: requests } = await supabase
    .from("service_requests")
    .select("*, categories(name, icon)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .returns<RequestWithCategory[]>();

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Meus pedidos</h1>
        <Link href="/pedidos/novo">
          <Button size="sm">Novo pedido</Button>
        </Link>
      </div>

      {requests && requests.length === 0 && (
        <EmptyState
          icon="📋"
          title="Você ainda não fez nenhum pedido"
          description="Crie um pedido para começar a receber respostas de profissionais."
          action={
            <Link href="/pedidos/novo">
              <Button>Criar pedido</Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-3">
        {requests?.map((request) => (
          <Link key={request.id} href={`/pedidos/${request.id}`}>
            <Card className="flex flex-col gap-2 hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {request.categories?.icon ?? "🛠️"}
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">{request.categories?.name ?? "Serviço"}</p>
                    <p className="text-xs text-neutral-500">
                      {request.neighborhood} · {new Date(`${request.desired_date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone[request.status] ?? "neutral"}>
                  {SERVICE_REQUEST_STATUS_LABELS[request.status]}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm text-neutral-600">{request.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
