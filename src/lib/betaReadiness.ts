/** Prontidão do beta: rótulos e cálculo de progresso a partir dos status (sem percentual inventado). */

export const READINESS_STATUSES = ["not_started", "in_progress", "blocked", "done"] as const;
export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

export const READINESS_STATUS_LABELS: Record<ReadinessStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  done: "Concluído",
};

export const READINESS_CATEGORIES = [
  "produto",
  "tecnologia",
  "seguranca",
  "operacao",
  "juridico",
  "comercial",
  "marketing",
  "piloto",
] as const;
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  produto: "Produto",
  tecnologia: "Tecnologia",
  seguranca: "Segurança",
  operacao: "Operação",
  juridico: "Jurídico",
  comercial: "Comercial",
  marketing: "Marketing",
  piloto: "Piloto",
};

export function isReadinessStatus(value: unknown): value is ReadinessStatus {
  return typeof value === "string" && (READINESS_STATUSES as readonly string[]).includes(value);
}

export type ReadinessItem = { category: string; status: string };

export type ReadinessSummary = {
  total: number;
  counts: Record<ReadinessStatus, number>;
  /** Itens concluídos / total, em %; null sem itens. Só "Concluído" conta como pronto. */
  percentDone: number | null;
};

export function summarizeReadiness(items: ReadinessItem[]): ReadinessSummary {
  const counts: Record<ReadinessStatus, number> = { not_started: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const item of items) {
    if (isReadinessStatus(item.status)) counts[item.status] += 1;
  }
  const total = items.length;
  return { total, counts, percentDone: total > 0 ? Math.round((counts.done / total) * 100) : null };
}

export function summarizeByCategory(items: ReadinessItem[]) {
  return READINESS_CATEGORIES.map((category) => ({
    category,
    label: READINESS_CATEGORY_LABELS[category],
    ...summarizeReadiness(items.filter((item) => item.category === category)),
  })).filter((group) => group.total > 0);
}
