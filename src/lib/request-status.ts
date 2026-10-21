import type { ServiceRequestStatus } from "@/lib/database.types";

const TERMINAL_STATUSES: ServiceRequestStatus[] = ["completed", "cancelled", "expired"];

/**
 * Etapas exibidas ao cliente, mapeadas para os status REAIS de
 * service_requests (enum service_request_status, migration 0001):
 * - open: pedido enviado, profissionais compatíveis notificados;
 * - reviewing: algum profissional respondeu (trigger
 *   sync_request_status_on_match_response) — aguarda o cliente confirmar;
 * - accepted: transição legada (o app atual vai direto para scheduled);
 * - scheduled: appointment criado (sync_request_status_on_appointment_insert);
 * - in_service / completed: espelham o appointment.
 */
const TIMELINE_STEPS: Array<{
  key: string;
  label: string;
  description: string;
  statuses: ServiceRequestStatus[];
}> = [
  { key: "created", label: "Pedido criado", description: "Recebemos seu pedido.", statuses: ["draft"] },
  {
    key: "searching",
    label: "Buscando profissional",
    description: "Avisamos profissionais compatíveis da sua região.",
    statuses: ["open"],
  },
  {
    key: "found",
    label: "Profissional encontrado",
    description: "Um profissional respondeu. Confirme para agendar.",
    statuses: ["reviewing", "accepted"],
  },
  {
    key: "scheduled",
    label: "Agendamento",
    description: "Data, horário e endereço confirmados.",
    statuses: ["scheduled"],
  },
  { key: "service", label: "Serviço", description: "O atendimento está acontecendo.", statuses: ["in_service"] },
  { key: "completed", label: "Concluído", description: "Atendimento finalizado.", statuses: ["completed"] },
];

export type RequestTimelineItem = {
  key: string;
  label: string;
  description: string;
  state: "complete" | "current" | "upcoming";
};

export function isRequestTerminal(status: ServiceRequestStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function getRequestTimeline(status: ServiceRequestStatus): RequestTimelineItem[] {
  const strip = ({ key, label, description }: (typeof TIMELINE_STEPS)[number]) => ({ key, label, description });

  if (status === "cancelled" || status === "expired") {
    return [
      { ...strip(TIMELINE_STEPS[0]), state: "complete" },
      {
        key: status,
        label: status === "cancelled" ? "Pedido cancelado" : "Pedido expirado",
        description:
          status === "cancelled"
            ? "Este pedido foi encerrado antes do atendimento."
            : "O prazo deste pedido terminou sem agendamento.",
        state: "current",
      },
    ];
  }

  const currentIndex = TIMELINE_STEPS.findIndex((step) => step.statuses.includes(status));
  const lastIndex = TIMELINE_STEPS.length - 1;

  return TIMELINE_STEPS.map((step, index) => ({
    ...strip(step),
    state:
      index < currentIndex || (status === "completed" && index === lastIndex)
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

export function getRequestStatusTone(
  status: ServiceRequestStatus,
): "neutral" | "brand" | "success" | "warning" | "danger" {
  if (status === "cancelled" || status === "expired") return "danger";
  if (status === "completed") return "neutral";
  if (status === "scheduled" || status === "in_service") return "success";
  if (status === "reviewing" || status === "accepted") return "warning";
  return status === "open" ? "brand" : "neutral";
}
