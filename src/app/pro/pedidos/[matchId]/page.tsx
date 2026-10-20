import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, RequestMatchRow, ServiceRequestRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { REQUEST_MATCH_STATUS_LABELS, SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { MatchResponseActions } from "./MatchResponseActions";
import { RequestPhotos } from "@/components/requests/RequestPhotos";

export default async function ProfessionalMatchPage({ params }: { params: { matchId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect=/pro/pedidos/${params.matchId}`);
  }

  const { data: match } = await supabase
    .from("request_matches")
    .select("*, service_requests(*, categories(*))")
    .eq("id", params.matchId)
    .maybeSingle<RequestMatchRow & { service_requests: (ServiceRequestRow & { categories: CategoryRow | null }) | null }>();

  if (!match || !match.service_requests) {
    notFound();
  }

  const request = match.service_requests;

  const { data: clientRows } = await supabase.rpc("get_request_client_name", { p_request_id: request.id });
  const clientName = clientRows?.[0]?.full_name ?? "Cliente";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {request.categories?.icon} {request.categories?.name}
          </p>
          <h1 className="text-xl font-bold text-neutral-900">Pedido de {clientName}</h1>
        </div>
        <Badge tone="brand">{SERVICE_REQUEST_STATUS_LABELS[request.status]}</Badge>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm text-neutral-800">{request.description}</p>
        <RequestPhotos paths={request.photo_paths} />
        <div className="grid grid-cols-2 gap-2 text-sm text-neutral-600">
          <p>📍 {request.neighborhood}, {request.city}</p>
          <p>📅 {new Date(`${request.desired_date}T00:00:00`).toLocaleDateString("pt-BR")}</p>
          <p>
            🕒 {request.time_window_start.slice(0, 5)} — {request.time_window_end.slice(0, 5)}
          </p>
          {request.is_urgent && <p className="font-medium text-brand-600">⚡ Urgente</p>}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-600">Sua resposta</span>
        <Badge
          tone={
            match.status === "accepted"
              ? "success"
              : match.status === "declined"
                ? "danger"
                : match.status === "proposed_new_time"
                  ? "warning"
                  : "neutral"
          }
        >
          {REQUEST_MATCH_STATUS_LABELS[match.status]}
        </Badge>
      </div>

      {match.status === "pending" && (
        <MatchResponseActions matchId={match.id} requestId={request.id} defaultDate={request.desired_date} />
      )}

      <Link
        href={`/pedidos/${request.id}/conversa/${user!.id}`}
        className="text-sm font-semibold text-brand-600 hover:underline"
      >
        Conversar com o cliente →
      </Link>
    </div>
  );
}
