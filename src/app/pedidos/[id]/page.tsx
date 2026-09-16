import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  AppointmentRow,
  CategoryRow,
  PublicProfessionalProfileRow,
  RequestMatchRow,
  ReviewRow,
  ServiceRequestRow,
} from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  REQUEST_MATCH_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
} from "@/lib/constants";
import { CancelButton } from "./CancelButton";
import { ConfirmMatchForm } from "./ConfirmMatchForm";

type MatchWithProfessional = RequestMatchRow & { professional: PublicProfessionalProfileRow | undefined };

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        icon="🔒"
        title="Entre para ver este pedido"
        action={
          <Link href={`/entrar?redirect=/pedidos/${params.id}`}>
            <Button>Entrar</Button>
          </Link>
        }
      />
    );
  }

  const { data: request } = await supabase
    .from("service_requests")
    .select("*, categories(*)")
    .eq("id", params.id)
    .maybeSingle<ServiceRequestRow & { categories: CategoryRow | null }>();

  if (!request) {
    notFound();
  }

  const { data: rawMatches } = await supabase
    .from("request_matches")
    .select("*")
    .eq("request_id", params.id)
    .order("created_at")
    .returns<RequestMatchRow[]>();

  // A view pública não tem FK real para request_matches, então buscamos os
  // perfis à parte e cruzamos os ids em memória (PostgREST não faz
  // embedding confiável através de views).
  const professionalIds = (rawMatches ?? []).map((m) => m.professional_id);
  const { data: matchProfessionals } =
    professionalIds.length > 0
      ? await supabase
          .from("public_professional_profiles")
          .select("*")
          .in("id", professionalIds)
          .returns<PublicProfessionalProfileRow[]>()
      : { data: [] as PublicProfessionalProfileRow[] };

  const professionalsById = new Map((matchProfessionals ?? []).map((p) => [p.id, p]));
  const matches: MatchWithProfessional[] = (rawMatches ?? []).map((match) => ({
    ...match,
    professional: professionalsById.get(match.professional_id),
  }));

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle<AppointmentRow>();

  const { data: review } = appointment
    ? await supabase
        .from("reviews")
        .select("*")
        .eq("appointment_id", appointment.id)
        .maybeSingle<ReviewRow>()
    : { data: null };

  let contact: { full_name: string; phone: string | null; email: string | null } | null = null;
  if (appointment) {
    const { data: contactRows } = await supabase.rpc("get_appointment_contact", {
      p_appointment_id: appointment.id,
    });
    contact = contactRows?.[0] ?? null;
  }

  const canCancel = ["draft", "open", "reviewing"].includes(request.status);
  const canConfirm = ["open", "reviewing"].includes(request.status) && !appointment;

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {request.categories?.icon} {request.categories?.name}
          </p>
          <h1 className="text-xl font-bold text-neutral-900">Pedido</h1>
        </div>
        <Badge tone="brand">{SERVICE_REQUEST_STATUS_LABELS[request.status]}</Badge>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm text-neutral-800">{request.description}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-neutral-600">
          <p>📍 {request.neighborhood}, {request.city}</p>
          <p>📅 {new Date(`${request.desired_date}T00:00:00`).toLocaleDateString("pt-BR")}</p>
          <p>
            🕒 {request.time_window_start.slice(0, 5)} — {request.time_window_end.slice(0, 5)}
          </p>
          {request.is_urgent && <p className="font-medium text-brand-600">⚡ Urgente</p>}
        </div>
      </Card>

      {appointment && (
        <Card className="flex flex-col gap-2 border-green-200 bg-green-50">
          <p className="font-semibold text-green-800">Agendamento confirmado</p>
          <p className="text-sm text-green-800">
            {new Date(`${appointment.scheduled_date}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
            {appointment.time_window_start.slice(0, 5)}–{appointment.time_window_end.slice(0, 5)}
          </p>
          {contact && (
            <div className="text-sm text-green-900">
              <p className="font-medium">Contato liberado: {contact.full_name}</p>
              {contact.phone && <p>📞 {contact.phone}</p>}
              {contact.email && <p>✉️ {contact.email}</p>}
            </div>
          )}
          <Link
            href={`/pedidos/${request.id}/conversa/${appointment.professional_id}`}
            className="text-sm font-semibold text-green-800 hover:underline"
          >
            Abrir conversa →
          </Link>
          {appointment.status === "completed" && !review && (
            <Link href={`/pedidos/${request.id}/avaliar`}>
              <Button size="sm" className="mt-1 w-fit">
                Avaliar profissional
              </Button>
            </Link>
          )}
          {review && <p className="text-sm text-green-800">Você já avaliou este atendimento. Obrigado!</p>}
        </Card>
      )}

      {canCancel && (
        <CancelButton requestId={request.id} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Respostas de profissionais</h2>

        {(!matches || matches.length === 0) && (
          <EmptyState
            icon="⏳"
            title="Aguardando profissionais"
            description="Assim que algum profissional compatível responder, ele aparece aqui."
          />
        )}

        {matches?.map((match) => (
          <Card key={match.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-neutral-900">
                  {match.professional?.full_name ?? "Profissional"}
                </p>
                <p className="text-xs text-neutral-500">
                  ⭐ {match.professional?.average_rating?.toFixed(1) ?? "—"} ({match.professional?.review_count ?? 0}{" "}
                  avaliações)
                </p>
              </div>
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

            {match.status === "proposed_new_time" && match.proposed_date && (
              <p className="text-sm text-neutral-700">
                Sugeriu: {new Date(`${match.proposed_date}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                {match.proposed_time_window_start?.slice(0, 5)}–{match.proposed_time_window_end?.slice(0, 5)}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/profissional/${match.professional_id}`}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Ver perfil
              </Link>
              <Link
                href={`/pedidos/${request.id}/conversa/${match.professional_id}`}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Conversar
              </Link>
            </div>

            {canConfirm && (match.status === "accepted" || match.status === "proposed_new_time") && (
              <ConfirmMatchForm
                requestId={request.id}
                matchId={match.id}
                professionalId={match.professional_id}
                defaultDate={match.proposed_date ?? request.desired_date}
                defaultStart={(match.proposed_time_window_start ?? request.time_window_start).slice(0, 5)}
                defaultEnd={(match.proposed_time_window_end ?? request.time_window_end).slice(0, 5)}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
