import { describe, expect, it } from "vitest";
import { decide, formatRetryAfter, MemoryRateLimitStore, RATE_LIMITS, rateLimitKey, rateLimitMessage } from "./rateLimit";

describe("MemoryRateLimitStore", () => {
  it("permite até o limite e bloqueia a partir daí, informando quando tentar de novo", async () => {
    let now = Date.UTC(2026, 9, 20, 12, 0, 10);
    const store = new MemoryRateLimitStore(() => now);

    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(await store.consume("k", 3, 60)).toEqual({ allowed: true, remaining: 3 - attempt });
    }
    expect(await store.consume("k", 3, 60)).toEqual({ allowed: false, retryAfterSeconds: 50 });

    now += 50_000; // nova janela
    expect(await store.consume("k", 3, 60)).toEqual({ allowed: true, remaining: 2 });
  });

  it("isola chaves diferentes (usuário/ação)", async () => {
    const store = new MemoryRateLimitStore(() => 0);
    await store.consume(rateLimitKey("message_send", "user:a"), 1, 60);
    expect((await store.consume(rateLimitKey("message_send", "user:a"), 1, 60)).allowed).toBe(false);
    expect((await store.consume(rateLimitKey("message_send", "user:b"), 1, 60)).allowed).toBe(true);
    expect((await store.consume(rateLimitKey("report_create", "user:a"), 1, 60)).allowed).toBe(true);
  });
});

describe("decide", () => {
  it("retryAfter nunca é menor que 1 segundo", () => {
    expect(decide(2, 1, 59_999, 60)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });
});

describe("políticas", () => {
  it("ações sem login usam escopo de IP e ações logadas usam usuário", () => {
    expect(RATE_LIMITS.auth_sign_in.scope).toBe("ip");
    expect(RATE_LIMITS.auth_sign_up.scope).toBe("ip");
    expect(RATE_LIMITS.event_track.scope).toBe("ip");
    expect(RATE_LIMITS.message_send.scope).toBe("user");
    expect(RATE_LIMITS.request_create.scope).toBe("user");
  });

  it("toda política tem limite e janela positivos e janela de até 1 dia (limite da função SQL)", () => {
    for (const policy of Object.values(RATE_LIMITS)) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeLessThanOrEqual(86_400);
    }
  });
});

describe("mensagens", () => {
  it("formata o tempo de espera de forma amigável", () => {
    expect(formatRetryAfter(1)).toBe("1 segundo");
    expect(formatRetryAfter(45)).toBe("45 segundos");
    expect(formatRetryAfter(61)).toBe("2 minutos");
    expect(rateLimitMessage(30)).toContain("30 segundos");
  });
});
