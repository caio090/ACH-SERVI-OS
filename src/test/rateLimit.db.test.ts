import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asServiceRole, asUser, createTestDb, IDS, one, seedRequestWithMatch, type Db } from "./db";

describe("0016 — rate limiting no banco", () => {
  let db: Db;
  let requestId: string;
  let conversationId: string;

  beforeAll(async () => {
    db = await createTestDb();
    ({ requestId } = await seedRequestWithMatch(db));
    conversationId = await asUser(db, IDS.client, async (tx) =>
      (
        await one<{ id: string }>(
          tx,
          "insert into public.conversations (request_id, client_id, professional_id) values ($1, $2, $3) returning id",
          [requestId, IDS.client, IDS.professional],
        )
      ).id,
    );
  });

  afterAll(() => db.close());

  it("consume_rate_limit conta por chave e bloqueia acima do limite", async () => {
    const results = await asServiceRole(db, async (tx) => {
      const out = [];
      for (let i = 0; i < 4; i++) {
        out.push(
          await one<{ allowed: boolean; remaining: number; retry_after_seconds: number }>(
            tx,
            "select * from public.consume_rate_limit('message_send:user:x', 3, 60)",
          ),
        );
      }
      return out;
    });
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retry_after_seconds).toBeGreaterThanOrEqual(1);
    expect(results[3].retry_after_seconds).toBeLessThanOrEqual(60);

    const other = await asServiceRole(db, (tx) =>
      one<{ allowed: boolean }>(tx, "select allowed from public.consume_rate_limit('message_send:user:y', 3, 60)"),
    );
    expect(other.allowed).toBe(true);
  });

  it("rejeita parâmetros inválidos", async () => {
    await expect(asServiceRole(db, (tx) => tx.query("select * from public.consume_rate_limit('', 3, 60)"))).rejects.toThrow(
      /inválidos/,
    );
    await expect(
      asServiceRole(db, (tx) => tx.query("select * from public.consume_rate_limit('k', 3, 999999)")),
    ).rejects.toThrow(/inválidos/);
  });

  it("usuário logado não consegue chamar o RPC nem ler os contadores", async () => {
    await expect(
      asUser(db, IDS.client, (tx) => tx.query("select * from public.consume_rate_limit('k', 1000, 60)")),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(db, IDS.client, (tx) => tx.query("select * from private.rate_limit_counters"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("bloqueia a 31ª mensagem do mesmo remetente em 1 minuto", async () => {
    await asUser(db, IDS.client, async (tx) => {
      for (let i = 0; i < 30; i++) {
        await tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, $3)", [
          conversationId,
          IDS.client,
          `mensagem ${i}`,
        ]);
      }
    });
    await expect(
      asUser(db, IDS.client, (tx) =>
        tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'mais uma')", [
          conversationId,
          IDS.client,
        ]),
      ),
    ).rejects.toThrow(/limite de mensagens/);

    // O outro participante não é afetado pelo limite de quem enviou.
    await asUser(db, IDS.professional, (tx) =>
      tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'resposta')", [
        conversationId,
        IDS.professional,
      ]),
    );
  });

  it("bloqueia a 11ª denúncia do mesmo usuário em 1 hora", async () => {
    await asUser(db, IDS.professional, async (tx) => {
      for (let i = 0; i < 10; i++) {
        await tx.query(
          "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'user', $2, 'teste')",
          [IDS.professional, IDS.client],
        );
      }
    });
    await expect(
      asUser(db, IDS.professional, (tx) =>
        tx.query("insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'user', $2, 'x')", [
          IDS.professional,
          IDS.client,
        ]),
      ),
    ).rejects.toThrow(/limite de denúncias/);
  });
});
