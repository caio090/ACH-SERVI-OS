/**
 * Analytics interno mínimo (sem serviço externo). Eventos de produto gravados
 * em public.product_events (migration 0019). Nenhum dado pessoal vai em
 * metadata: só chaves permitidas por evento, valores primitivos e curtos.
 */

export const PRODUCT_EVENTS = [
  "home_view",
  "search_started",
  "category_selected",
  "request_started",
  "request_submitted",
  "professional_matched",
  "professional_accepted",
  "appointment_confirmed",
  "service_started",
  "service_completed",
  "review_submitted",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

/** Eventos que o navegador pode enviar para /api/events. Os demais só o servidor grava. */
export const CLIENT_EVENTS = ["home_view", "search_started", "category_selected", "request_started"] as const;
export type ClientEventName = (typeof CLIENT_EVENTS)[number];

const ALLOWED_METADATA: Record<ProductEventName, readonly string[]> = {
  home_view: [],
  search_started: ["has_query"],
  category_selected: ["category_slug"],
  request_started: ["has_category", "from_search"],
  request_submitted: ["category_slug", "photo_count", "is_urgent"],
  professional_matched: ["match_count"],
  professional_accepted: ["response"],
  appointment_confirmed: [],
  service_started: [],
  service_completed: [],
  review_submitted: ["rating"],
};

export type EventMetadata = Record<string, string | number | boolean>;

export function isProductEvent(value: unknown): value is ProductEventName {
  return typeof value === "string" && (PRODUCT_EVENTS as readonly string[]).includes(value);
}

export function isClientEvent(value: unknown): value is ClientEventName {
  return typeof value === "string" && (CLIENT_EVENTS as readonly string[]).includes(value);
}

/** Mantém só chaves permitidas para o evento e valores primitivos curtos. */
export function sanitizeEventMetadata(event: ProductEventName, metadata: unknown): EventMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const allowed = ALLOWED_METADATA[event];
  const clean: EventMetadata = {};
  for (const key of allowed) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === "boolean") clean[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === "string" && value.length > 0) clean[key] = value.slice(0, 64);
  }
  return clean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClientEventPayload = {
  event: ClientEventName;
  anonymousId: string | null;
  metadata: EventMetadata;
};

export function parseClientEventPayload(body: unknown): { ok: true; payload: ClientEventPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const record = body as Record<string, unknown>;
  if (!isClientEvent(record.event)) return { ok: false, error: "invalid_event" };
  const anonymousId = typeof record.anonymousId === "string" && UUID_PATTERN.test(record.anonymousId) ? record.anonymousId : null;
  return {
    ok: true,
    payload: { event: record.event, anonymousId, metadata: sanitizeEventMetadata(record.event, record.metadata) },
  };
}

/** Etapas do funil na ordem do ciclo do produto. */
export const FUNNEL_STEPS: Array<{ event: ProductEventName; label: string }> = [
  { event: "home_view", label: "Visita" },
  { event: "request_started", label: "Início de pedido" },
  { event: "request_submitted", label: "Pedido enviado" },
  { event: "professional_matched", label: "Match com profissional" },
  { event: "professional_accepted", label: "Aceite do profissional" },
  { event: "appointment_confirmed", label: "Agendamento confirmado" },
  { event: "service_completed", label: "Serviço concluído" },
  { event: "review_submitted", label: "Avaliação" },
];

export type FunnelCounts = Partial<Record<ProductEventName, number>>;

export type FunnelStep = {
  event: ProductEventName;
  label: string;
  count: number;
  /** % em relação à etapa anterior; null quando a anterior é zero. */
  fromPrevious: number | null;
  /** % em relação à primeira etapa; null quando a primeira é zero. */
  fromStart: number | null;
};

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

export function buildFunnel(counts: FunnelCounts): FunnelStep[] {
  const first = counts[FUNNEL_STEPS[0].event] ?? 0;
  return FUNNEL_STEPS.map((step, index) => {
    const count = counts[step.event] ?? 0;
    const previous = index === 0 ? count : (counts[FUNNEL_STEPS[index - 1].event] ?? 0);
    return {
      ...step,
      count,
      fromPrevious: index === 0 ? null : percent(count, previous),
      fromStart: index === 0 ? null : percent(count, first),
    };
  });
}
