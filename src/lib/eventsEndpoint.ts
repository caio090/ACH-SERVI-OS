import { parseClientEventPayload, type ClientEventPayload } from "@/lib/analytics";
import type { RateLimitCheck } from "@/lib/rateLimit.server";

/**
 * Lógica do POST /api/events separada do runtime do Next para ser testável.
 * Responde 204 (gravado), 400 (payload inválido) ou 429 (limite atingido,
 * com Retry-After).
 */
export type EventsEndpointDeps = {
  checkRateLimit: () => Promise<RateLimitCheck>;
  getUserId: () => Promise<string | null>;
  record: (payload: ClientEventPayload, userId: string | null) => Promise<void>;
};

export async function handleEventsRequest(request: Request, deps: EventsEndpointDeps): Promise<Response> {
  const limit = await deps.checkRateLimit();
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: "rate_limited", message: limit.error }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), { status: 413, headers: { "Content-Type": "application/json" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const parsed = parseClientEventPayload(body);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  await deps.record(parsed.payload, await deps.getUserId());
  return new Response(null, { status: 204 });
}
