import type { ServiceRequestStatus } from "@/lib/database.types";

const TERMINAL_STATUSES: ServiceRequestStatus[] = ["completed", "cancelled", "expired"];

const TIMELINE_STATUSES: Array<{
  status: ServiceRequestStatus;
  label: string;
  description: string;
}> = [
  { status: "open", label: "Pedido enviado", description: "Seu pedido já está disponível." },
  { status: "reviewing", label: "Buscando profissionais", description: "Profissionais compatíveis podem responder." },
  { status: "accepted", label: "Profissional confirmado", description: "Você escolheu quem fará o serviço." },
  { status: "scheduled", label: "Serviço agendado", description: "Data, horário e endereço foram confirmados." },
  { status: "in_service", label: "Em atendimento", description: "O serviço está acontecendo." },
  { status: "completed", label: "Concluído", description: "O atendimento foi finalizado." },
];

export type RequestTimelineItem = (typeof TIMELINE_STATUSES)[number] & {
  state: "complete" | "current" | "upcoming";
};

export function isRequestTerminal(status: ServiceRequestStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function getRequestTimeline(status: ServiceRequestStatus): RequestTimelineItem[] {
  if (status === "cancelled" || status === "expired") {
    return [
      { ...TIMELINE_STATUSES[0], state: "complete" },
      {
        status,
        label: status === "cancelled" ? "Pedido cancelado" : "Pedido expirado",
        description:
          status === "cancelled"
            ? "Este pedido foi encerrado antes do atendimento."
            : "O prazo deste pedido terminou sem agendamento.",
        state: "current",
      },
    ];
  }

  const normalizedStatus = status === "draft" ? "open" : status;
  const currentIndex = TIMELINE_STATUSES.findIndex((item) => item.status === normalizedStatus);

  return TIMELINE_STATUSES.map((item, index) => ({
    ...item,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
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
