/**
 * Rate limiting do MVP — parte pura (políticas, store em memória e mensagens).
 * A escolha do store e a identificação do chamador ficam em rateLimit.server.ts.
 *
 * Janela fixa: cada chave tem um contador por janela de `windowSeconds`.
 * É o mesmo algoritmo da função SQL public.consume_rate_limit (0016).
 */

export type RateLimitAction =
  | "auth_sign_in"
  | "auth_sign_up"
  | "request_create"
  | "message_send"
  | "image_upload"
  | "review_create"
  | "report_create"
  | "admin_action"
  | "event_track";

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  /** "ip" para ações sem login (hash do IP); "user" para ações autenticadas. */
  scope: "ip" | "user";
};

export const RATE_LIMITS: Record<RateLimitAction, RateLimitPolicy> = {
  auth_sign_in: { limit: 10, windowSeconds: 5 * 60, scope: "ip" },
  auth_sign_up: { limit: 5, windowSeconds: 60 * 60, scope: "ip" },
  request_create: { limit: 5, windowSeconds: 60 * 60, scope: "user" },
  message_send: { limit: 20, windowSeconds: 60, scope: "user" },
  image_upload: { limit: 30, windowSeconds: 60 * 60, scope: "user" },
  review_create: { limit: 10, windowSeconds: 60 * 60, scope: "user" },
  report_create: { limit: 5, windowSeconds: 60 * 60, scope: "user" },
  admin_action: { limit: 60, windowSeconds: 60, scope: "user" },
  event_track: { limit: 120, windowSeconds: 60, scope: "ip" },
};

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export interface RateLimitStore {
  consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision>;
}

export function rateLimitKey(action: RateLimitAction, subject: string) {
  return `${action}:${subject}`;
}

export function windowStart(nowMs: number, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  return Math.floor(nowMs / windowMs) * windowMs;
}

export function decide(hits: number, limit: number, nowMs: number, windowSeconds: number): RateLimitDecision {
  if (hits <= limit) {
    return { allowed: true, remaining: limit - hits };
  }
  const resetMs = windowStart(nowMs, windowSeconds) + windowSeconds * 1000;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetMs - nowMs) / 1000)) };
}

/**
 * Store em memória do processo. Serve para testes e desenvolvimento local;
 * em produção serverless cada instância teria o próprio contador, por isso o
 * store padrão de produção é o Postgres (ver rateLimit.server.ts).
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private counters = new Map<string, { windowStart: number; hits: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const nowMs = this.now();
    const start = windowStart(nowMs, windowSeconds);
    const current = this.counters.get(key);
    const hits = current && current.windowStart === start ? current.hits + 1 : 1;
    this.counters.set(key, { windowStart: start, hits });
    if (this.counters.size > 10_000) {
      this.prune(nowMs);
    }
    return decide(hits, limit, nowMs, windowSeconds);
  }

  private prune(nowMs: number) {
    for (const [key, value] of Array.from(this.counters.entries())) {
      if (nowMs - value.windowStart > 24 * 60 * 60 * 1000) this.counters.delete(key);
    }
  }
}

export function formatRetryAfter(seconds: number) {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

export function rateLimitMessage(retryAfterSeconds: number) {
  return `Muitas tentativas em pouco tempo. Tente novamente em ${formatRetryAfter(retryAfterSeconds)}.`;
}
