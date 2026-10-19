import type { CategoryRow } from "@/lib/database.types";

export const REQUEST_DRAFT_STORAGE_KEY = "acho-servico:request-draft:v1";

export const PREVIEW_REQUEST_CATEGORIES: CategoryRow[] = [
  { id: "preview-eletricista", slug: "eletricista", name: "Eletricista", icon: "⚡", is_active: true, sort_order: 1, created_at: "" },
  { id: "preview-encanador", slug: "encanador", name: "Encanador", icon: "🔧", is_active: true, sort_order: 2, created_at: "" },
  { id: "preview-refrigeracao", slug: "refrigeracao-ar-condicionado", name: "Ar-condicionado", icon: "❄️", is_active: true, sort_order: 3, created_at: "" },
  { id: "preview-pedreiro", slug: "pedreiro", name: "Pedreiro", icon: "🧱", is_active: true, sort_order: 4, created_at: "" },
  { id: "preview-pintor", slug: "pintor", name: "Pintor", icon: "🎨", is_active: true, sort_order: 5, created_at: "" },
  { id: "preview-faz-tudo", slug: "servicos-gerais-faz-tudo", name: "Faz-tudo", icon: "🧰", is_active: true, sort_order: 6, created_at: "" },
];

export type RequestUrgency = "" | "now" | "today" | "week" | "scheduled";
export type RequestDateChoice = "" | "today" | "tomorrow" | "custom";
export type RequestTimeSlot = "" | "morning" | "afternoon" | "night";
export type RequestWizardStep = 1 | 2 | 3 | 4 | 5;

export type RequestDraft = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  searchQuery: string;
  description: string;
  urgency: RequestUrgency;
  neighborhood: string;
  city: string;
  dateChoice: RequestDateChoice;
  customDate: string;
  timeSlot: RequestTimeSlot;
};

export type ServiceRequestPayload = {
  category_id: string;
  description: string;
  neighborhood: string;
  city: string;
  desired_date: string;
  time_window_start: string;
  time_window_end: string;
  is_urgent: boolean;
};

export const REQUEST_STEP_LABELS = [
  "Serviço",
  "Problema",
  "Localização",
  "Data e horário",
  "Revisão",
] as const;

export const URGENCY_OPTIONS: Array<{
  value: Exclude<RequestUrgency, "">;
  label: string;
  description: string;
}> = [
  { value: "now", label: "Agora", description: "Preciso de ajuda o quanto antes" },
  { value: "today", label: "Hoje", description: "Pode ser em qualquer horário de hoje" },
  { value: "week", label: "Esta semana", description: "Tenho flexibilidade nos próximos dias" },
  { value: "scheduled", label: "Escolher data", description: "Quero indicar um dia específico" },
];

export const TIME_SLOTS: Record<
  Exclude<RequestTimeSlot, "">,
  { label: string; detail: string; start: string; end: string }
> = {
  morning: { label: "Manhã", detail: "08h às 12h", start: "08:00", end: "12:00" },
  afternoon: { label: "Tarde", detail: "13h às 18h", start: "13:00", end: "18:00" },
  night: { label: "Noite", detail: "18h às 22h", start: "18:00", end: "22:00" },
};

export function createEmptyRequestDraft(searchQuery = ""): RequestDraft {
  return {
    categoryId: "",
    categorySlug: "",
    categoryName: "",
    categoryIcon: "",
    searchQuery,
    description: "",
    urgency: "",
    neighborhood: "",
    city: "",
    dateChoice: "",
    customDate: "",
    timeSlot: "",
  };
}

export function parseStoredRequestDraft(value: string | null): RequestDraft | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<RequestDraft>;
    const empty = createEmptyRequestDraft();
    const draft = { ...empty, ...parsed };

    const urgencyValues: RequestUrgency[] = ["", "now", "today", "week", "scheduled"];
    const dateValues: RequestDateChoice[] = ["", "today", "tomorrow", "custom"];
    const timeValues: RequestTimeSlot[] = ["", "morning", "afternoon", "night"];
    const stringFields = [
      draft.categoryId,
      draft.categorySlug,
      draft.categoryName,
      draft.categoryIcon,
      draft.searchQuery,
      draft.description,
      draft.neighborhood,
      draft.city,
      draft.customDate,
    ];

    if (
      stringFields.some((field) => typeof field !== "string") ||
      !urgencyValues.includes(draft.urgency) ||
      !dateValues.includes(draft.dateChoice) ||
      !timeValues.includes(draft.timeSlot)
    ) {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function getNextRequestStep(step: RequestWizardStep): RequestWizardStep {
  return Math.min(step + 1, 5) as RequestWizardStep;
}

export function getPreviousRequestStep(step: RequestWizardStep): RequestWizardStep {
  return Math.max(step - 1, 1) as RequestWizardStep;
}

export function validateRequestStep(draft: RequestDraft, step: RequestWizardStep): string | null {
  if (step === 1 && !draft.categoryId) return "Escolha uma categoria para continuar.";

  if (step === 2) {
    const descriptionLength = draft.description.trim().length;
    if (descriptionLength < 15) return "Descreva o problema com pelo menos 15 caracteres.";
    if (descriptionLength > 600) return "A descrição deve ter no máximo 600 caracteres.";
    if (!draft.urgency) return "Diga quando você precisa do serviço.";
  }

  if (step === 3) {
    if (draft.neighborhood.trim().length < 2) return "Informe o bairro do serviço.";
    if (draft.city.trim().length < 2) return "Informe a cidade do serviço.";
  }

  if (step === 4) {
    if (!draft.dateChoice) return "Escolha o dia desejado.";
    if (draft.dateChoice === "custom" && !draft.customDate) return "Escolha uma data para o serviço.";
    if (!draft.timeSlot) return "Escolha um período do dia.";
  }

  return null;
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function resolveDesiredDate(draft: RequestDraft, today: string): string {
  if (draft.dateChoice === "tomorrow") return addDays(today, 1);
  if (draft.dateChoice === "custom") return draft.customDate;
  return today;
}

export function buildServiceRequestPayload(
  draft: RequestDraft,
  today: string,
): ServiceRequestPayload {
  const errors = ([1, 2, 3, 4] as RequestWizardStep[])
    .map((step) => validateRequestStep(draft, step))
    .filter(Boolean);

  if (errors.length > 0) throw new Error(errors[0] as string);

  const desiredDate = resolveDesiredDate(draft, today);
  if (desiredDate < today) throw new Error("A data do serviço não pode estar no passado.");

  const timeSlot = TIME_SLOTS[draft.timeSlot as Exclude<RequestTimeSlot, "">];

  return {
    category_id: draft.categoryId,
    description: draft.description.trim(),
    neighborhood: draft.neighborhood.trim(),
    city: draft.city.trim(),
    desired_date: desiredDate,
    time_window_start: timeSlot.start,
    time_window_end: timeSlot.end,
    is_urgent: draft.urgency === "now",
  };
}

export function requestPayloadToFormData(payload: ServiceRequestPayload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.set(key, typeof value === "boolean" ? (value ? "on" : "") : value);
  });
  return formData;
}

export function getRequestLoginUrl() {
  return `/entrar?redirect=${encodeURIComponent("/pedir?retomar=1")}`;
}

export function formatRequestDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
