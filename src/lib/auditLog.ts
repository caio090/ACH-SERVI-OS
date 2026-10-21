/** Rótulos das ações gravadas pelos triggers de auditoria (migration 0017 e seguintes). */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  "user.suspended": "Suspendeu usuário",
  "user.reactivated": "Reativou usuário",
  "user.role_changed": "Alterou papel do usuário",
  "professional.verified": "Verificou profissional",
  "professional.unverified": "Removeu verificação de profissional",
  "professional.paused": "Pausou profissional",
  "professional.reactivated": "Reativou profissional",
  "category.created": "Criou categoria",
  "category.updated": "Alterou categoria",
  "category.deleted": "Removeu categoria",
  "report.resolved": "Resolveu denúncia",
  "review.deleted": "Removeu avaliação",
  "service_request.status_changed": "Alterou status de pedido",
  "appointment.status_changed": "Alterou status de agendamento",
  "beta_readiness.updated": "Atualizou item de prontidão do beta",
};

export function describeAdminAction(action: string) {
  return ADMIN_ACTION_LABELS[action] ?? action;
}

/** Resumo curto de metadata para exibição (ex.: "open → cancelled"). */
export function summarizeAuditMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const record = metadata as Record<string, unknown>;
  if ("from" in record && "to" in record) {
    return `${String(record.from)} → ${String(record.to)}`;
  }
  if (record.changes && typeof record.changes === "object") {
    return Object.entries(record.changes as Record<string, { from?: unknown; to?: unknown }>)
      .map(([field, change]) => `${field}: ${String(change?.from)} → ${String(change?.to)}`)
      .join("; ");
  }
  if (typeof record.slug === "string") return record.slug;
  return "";
}
