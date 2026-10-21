"use client";

import type { ClientEventName, EventMetadata } from "@/lib/analytics";

const ANONYMOUS_ID_KEY = "acho-servico:anon-id:v1";

/** Identificador aleatório do navegador (não é dado pessoal); some se o usuário limpar os dados do site. */
function getAnonymousId(): string | null {
  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/** Envia um evento de produto sem bloquear a interface; falhas são ignoradas. */
export function trackClientEvent(event: ClientEventName, metadata: EventMetadata = {}) {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, anonymousId: getAnonymousId(), metadata }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // analytics nunca pode quebrar a página
  }
}
