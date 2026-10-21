import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MemoryRateLimitStore,
  RATE_LIMITS,
  rateLimitKey,
  rateLimitMessage,
  type RateLimitAction,
  type RateLimitDecision,
  type RateLimitStore,
} from "@/lib/rateLimit";

/**
 * Store compartilhado entre instâncias: contador em Postgres via RPC
 * public.consume_rate_limit (migration 0016), executável só com service role.
 */
class SupabaseRateLimitStore implements RateLimitStore {
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    const row = data?.[0];
    if (error || !row) {
      throw new Error(`consume_rate_limit falhou: ${error?.message ?? "sem retorno"}`);
    }
    return row.allowed
      ? { allowed: true, remaining: row.remaining }
      : { allowed: false, retryAfterSeconds: Math.max(1, row.retry_after_seconds) };
  }
}

const memoryStore = new MemoryRateLimitStore();
let warnedAboutMemoryStore = false;

function getStore(): RateLimitStore {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseRateLimitStore();
  }
  if (process.env.NODE_ENV === "production" && !warnedAboutMemoryStore) {
    warnedAboutMemoryStore = true;
    console.warn("Rate limit usando memória do processo: configure SUPABASE_SERVICE_ROLE_KEY para limite compartilhado.");
  }
  return memoryStore;
}

/**
 * IP do cliente, pseudonimizado (SHA-256 com sal). O IP bruto nunca é
 * gravado. Na Vercel, x-forwarded-for é definido pela plataforma.
 */
export function getClientIpHash() {
  const headerList = headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerList.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "acho-servico-rate-limit";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type RateLimitCheck = { ok: true } | { ok: false; error: string; retryAfterSeconds: number };

/**
 * Consome uma unidade do limite da ação. `subject` é o id do usuário para
 * ações autenticadas; para escopo "ip" usa o hash do IP da requisição.
 * Se o store falhar, a ação segue (fail-open) e o erro é logado — os limites
 * críticos de escrita também existem no próprio banco (0003 e 0016).
 */
export async function checkRateLimit(action: RateLimitAction, userId?: string): Promise<RateLimitCheck> {
  const policy = RATE_LIMITS[action];
  const subject = policy.scope === "user" && userId ? `user:${userId}` : `ip:${getClientIpHash()}`;
  try {
    const decision = await getStore().consume(rateLimitKey(action, subject), policy.limit, policy.windowSeconds);
    if (decision.allowed) return { ok: true };
    return { ok: false, error: rateLimitMessage(decision.retryAfterSeconds), retryAfterSeconds: decision.retryAfterSeconds };
  } catch (error) {
    console.error("Rate limit indisponível, seguindo sem limite:", error);
    return { ok: true };
  }
}
