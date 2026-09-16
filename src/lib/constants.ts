import type {
  AppointmentStatus,
  RequestMatchStatus,
  ServiceRequestStatus,
} from "@/lib/database.types";

export const BRAND_NAME = "ACHÔ SERVIÇO";
export const BRAND_TAGLINE = "Precisou? Achô.";

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  draft: "Rascunho",
  open: "Aguardando profissionais",
  reviewing: "Respostas recebidas",
  accepted: "Profissional confirmado",
  scheduled: "Agendado",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const REQUEST_MATCH_STATUS_LABELS: Record<RequestMatchStatus, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceito",
  declined: "Recusado",
  proposed_new_time: "Sugeriu outro horário",
  expired: "Expirado",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const WEEKDAY_SHORT_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
