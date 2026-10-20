import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFunnel, CLIENT_EVENTS, FUNNEL_STEPS, parseClientEventPayload, PRODUCT_EVENTS, sanitizeEventMetadata } from "./analytics";
import { handleEventsRequest, type EventsEndpointDeps } from "./eventsEndpoint";

const ANON = "3f2b8c1e-9d4a-4b6e-8f10-2a3b4c5d6e7f";

describe("eventos de produto", () => {
  it("a lista de eventos do app é a mesma aceita pelo banco (0019)", () => {
    const sql = readFileSync(path.resolve(__dirname, "../../supabase/migrations/0019_product_events.sql"), "utf8");
    const inCheck = sql.match(/event_name in \(([\s\S]*?)\)\)/)?.[1] ?? "";
    const dbEvents = Array.from(inCheck.matchAll(/'([a-z_]+)'/g), (match) => match[1]);
    expect([...dbEvents].sort()).toEqual([...PRODUCT_EVENTS].sort());
  });

  it("metadata mantém só chaves permitidas e valores primitivos curtos", () => {
    expect(
      sanitizeEventMetadata("request_submitted", {
        category_slug: "eletricista",
        photo_count: 2,
        email: "pessoa@example.com",
        description: "texto livre",
        nested: { a: 1 },
      }),
    ).toEqual({ category_slug: "eletricista", photo_count: 2 });
    expect(sanitizeEventMetadata("category_selected", { category_slug: "x".repeat(200) }).category_slug).toHaveLength(64);
    expect(sanitizeEventMetadata("home_view", ["a"])).toEqual({});
  });

  it("navegador só pode enviar eventos de navegação, nunca etapas do servidor", () => {
    expect(parseClientEventPayload({ event: "home_view", anonymousId: ANON })).toMatchObject({ ok: true });
    expect(parseClientEventPayload({ event: "service_completed" })).toEqual({ ok: false, error: "invalid_event" });
    expect(parseClientEventPayload({ event: "review_submitted" })).toMatchObject({ ok: false });
    expect(CLIENT_EVENTS).not.toContain("request_submitted");
  });

  it("descarta anonymousId que não é UUID", () => {
    const parsed = parseClientEventPayload({ event: "home_view", anonymousId: "<script>" });
    expect(parsed).toMatchObject({ ok: true, payload: { anonymousId: null } });
  });
});

describe("funil", () => {
  it("calcula conversão etapa a etapa e desde a visita", () => {
    const funnel = buildFunnel({ home_view: 200, request_started: 50, request_submitted: 20, professional_matched: 10 });
    expect(funnel.map((step) => step.event)).toEqual(FUNNEL_STEPS.map((step) => step.event));
    expect(funnel[0]).toMatchObject({ count: 200, fromPrevious: null, fromStart: null });
    expect(funnel[1]).toMatchObject({ count: 50, fromPrevious: 25, fromStart: 25 });
    expect(funnel[2]).toMatchObject({ count: 20, fromPrevious: 40, fromStart: 10 });
    expect(funnel[4]).toMatchObject({ count: 0, fromPrevious: 0 });
  });

  it("não inventa percentual quando não há dados", () => {
    const funnel = buildFunnel({});
    expect(funnel.every((step) => step.count === 0)).toBe(true);
    expect(funnel.slice(1).every((step) => step.fromPrevious === null && step.fromStart === null)).toBe(true);
  });
});

describe("POST /api/events", () => {
  function deps(overrides: Partial<EventsEndpointDeps> = {}) {
    const recorded: unknown[] = [];
    return {
      recorded,
      deps: {
        checkRateLimit: async () => ({ ok: true }) as const,
        getUserId: async () => null,
        record: async (payload, userId) => {
          recorded.push({ payload, userId });
        },
        ...overrides,
      } satisfies EventsEndpointDeps,
    };
  }

  const post = (body: unknown) =>
    new Request("http://localhost/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("grava evento válido e responde 204", async () => {
    const { deps: d, recorded } = deps({ getUserId: async () => "user-1" });
    const response = await handleEventsRequest(post({ event: "request_started", anonymousId: ANON, metadata: { from_search: true } }), d);
    expect(response.status).toBe(204);
    expect(recorded).toEqual([
      { payload: { event: "request_started", anonymousId: ANON, metadata: { from_search: true } }, userId: "user-1" },
    ]);
  });

  it("responde 429 com Retry-After quando o limite estoura, sem gravar", async () => {
    const { deps: d, recorded } = deps({
      checkRateLimit: async () => ({ ok: false, error: "Muitas tentativas", retryAfterSeconds: 42 }),
    });
    const response = await handleEventsRequest(post({ event: "home_view" }), d);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(recorded).toHaveLength(0);
  });

  it("responde 400 para evento não permitido ou JSON inválido", async () => {
    const { deps: d, recorded } = deps();
    expect((await handleEventsRequest(post({ event: "service_completed" }), d)).status).toBe(400);
    const broken = new Request("http://localhost/api/events", { method: "POST", body: "{nope" });
    expect((await handleEventsRequest(broken, d)).status).toBe(400);
    expect(recorded).toHaveLength(0);
  });
});
