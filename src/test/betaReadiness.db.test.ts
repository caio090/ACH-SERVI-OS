import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, IDS, one, rows, type Db } from "./db";

describe("0020 — prontidão do beta e métricas do piloto", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createTestDb();
    await createUser(db, { id: IDS.admin, email: "admin@example.com", role: "admin" });
    await createUser(db, { id: IDS.client, email: "cliente@example.com" });
    await createUser(db, { id: IDS.professional, email: "pro@example.com" });
    await asUser(db, IDS.professional, (tx) =>
      tx.query("insert into public.professional_profiles (id) values ($1)", [IDS.professional]),
    );
  });

  afterAll(() => db.close());

  it("checklist inicial existe e só admin vê", async () => {
    const items = await asUser(db, IDS.admin, (tx) => rows<{ status: string }>(tx, "select status from public.beta_readiness_items"));
    expect(items.length).toBeGreaterThan(20);
    expect(await asUser(db, IDS.client, (tx) => rows(tx, "select id from public.beta_readiness_items"))).toHaveLength(0);
  });

  it("admin atualiza status; quem e quando ficam registrados e vão para o audit log", async () => {
    const item = await one<{ id: string }>(db, "select id from public.beta_readiness_items where category = 'comercial' order by sort_order limit 1");
    await asUser(db, IDS.admin, (tx) =>
      tx.query("update public.beta_readiness_items set status = 'in_progress' where id = $1", [item.id]),
    );
    const updated = await one<{ status: string; updated_by: string }>(
      db,
      "select status, updated_by from public.beta_readiness_items where id = $1",
      [item.id],
    );
    expect(updated).toEqual({ status: "in_progress", updated_by: IDS.admin });
    const log = await one<{ action: string }>(db, "select action from public.admin_action_logs where target_id = $1", [item.id]);
    expect(log.action).toBe("beta_readiness.updated");
  });

  it("rejeita status fora da lista e usuário comum não altera", async () => {
    await expect(
      asUser(db, IDS.admin, (tx) => tx.query("update public.beta_readiness_items set status = '80%'")),
    ).rejects.toThrow(/check constraint/);
    const result = await asUser(db, IDS.client, (tx) => tx.query("update public.beta_readiness_items set status = 'done'"));
    expect(result.affectedRows).toBe(0);
  });

  it("admin_beta_metrics conta dados reais e é só para admin", async () => {
    const metrics = await asUser(db, IDS.admin, (tx) =>
      one<Record<string, number>>(
        tx,
        `select clients_registered::int, professionals_registered::int, professionals_verified::int,
                requests_open::int, requests_with_match::int, appointments_total::int,
                services_completed::int, reviews_total::int
         from public.admin_beta_metrics()`,
      ),
    );
    expect(metrics).toEqual({
      clients_registered: 1,
      professionals_registered: 1,
      professionals_verified: 0,
      requests_open: 0,
      requests_with_match: 0,
      appointments_total: 0,
      services_completed: 0,
      reviews_total: 0,
    });
    await expect(asUser(db, IDS.client, (tx) => tx.query("select * from public.admin_beta_metrics()"))).rejects.toThrow(
      /acesso negado/,
    );
  });
});
