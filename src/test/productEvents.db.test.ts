import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asServiceRole, asUser, createTestDb, createUser, IDS, rows, type Db } from "./db";

describe("0019 — product_events e funil", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createTestDb();
    await createUser(db, { id: IDS.client, email: "cliente@example.com" });
    await createUser(db, { id: IDS.admin, email: "admin@example.com", role: "admin" });
    await asServiceRole(db, async (tx) => {
      const anonA = "11111111-1111-4111-8111-111111111111";
      const anonB = "22222222-2222-4222-8222-222222222222";
      for (const [event, user, anon] of [
        ["home_view", null, anonA],
        ["home_view", null, anonA],
        ["home_view", null, anonB],
        ["home_view", IDS.client, null],
        ["request_started", IDS.client, null],
        ["request_submitted", IDS.client, null],
      ] as const) {
        await tx.query("insert into public.product_events (event_name, user_id, anonymous_id) values ($1, $2, $3)", [event, user, anon]);
      }
    });
  });

  afterAll(() => db.close());

  it("backend (service role) grava; banco rejeita evento fora da lista e metadata não-objeto", async () => {
    await expect(
      asServiceRole(db, (tx) => tx.query("insert into public.product_events (event_name) values ('pagamento_feito')")),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asServiceRole(db, (tx) => tx.query(`insert into public.product_events (event_name, metadata) values ('home_view', '[1,2]')`)),
    ).rejects.toThrow(/check constraint/);
  });

  it("usuário comum e anônimo não gravam nem leem eventos", async () => {
    await expect(
      asUser(db, IDS.client, (tx) => tx.query("insert into public.product_events (event_name) values ('home_view')")),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, (tx) => tx.query("insert into public.product_events (event_name) values ('home_view')"))).rejects.toThrow(
      /permission denied/,
    );
    expect(await asUser(db, IDS.client, (tx) => rows(tx, "select id from public.product_events"))).toHaveLength(0);
  });

  it("admin_product_funnel conta atores distintos por etapa", async () => {
    const funnel = await asUser(db, IDS.admin, (tx) =>
      rows<{ event_name: string; actors: number; events: number }>(
        tx,
        "select event_name, actors::int, events::int from public.admin_product_funnel(now() - interval '1 day') order by event_name",
      ),
    );
    expect(funnel).toEqual([
      { event_name: "home_view", actors: 3, events: 4 },
      { event_name: "request_started", actors: 1, events: 1 },
      { event_name: "request_submitted", actors: 1, events: 1 },
    ]);
  });

  it("funil é só para admin", async () => {
    await expect(
      asUser(db, IDS.client, (tx) => tx.query("select * from public.admin_product_funnel(now() - interval '1 day')")),
    ).rejects.toThrow(/acesso negado/);
  });
});
