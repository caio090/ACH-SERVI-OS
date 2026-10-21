import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asServiceRole, asUser, createTestDb, createUser, IDS, one, rows, seedRequestWithMatch, type Db } from "./db";

type LogRow = { admin_id: string; action: string; target_type: string; target_id: string; metadata: Record<string, unknown> };

describe("0017 — audit log administrativo", () => {
  let db: Db;
  let requestId: string;

  beforeAll(async () => {
    db = await createTestDb();
    ({ requestId } = await seedRequestWithMatch(db));
    await createUser(db, { id: IDS.admin, email: "admin.teste@example.com", role: "admin" });
    await createUser(db, { id: IDS.outsider, email: "outsider@example.com" });
  });

  afterAll(() => db.close());

  async function logsFor(targetId: string) {
    return rows<LogRow>(db, "select admin_id, action, target_type, target_id, metadata from public.admin_action_logs where target_id = $1 order by created_at, action", [
      targetId,
    ]);
  }

  it("registra suspensão/reativação de usuário com quem, o quê e qual registro", async () => {
    await asUser(db, IDS.admin, (tx) => tx.query("update public.profiles set is_suspended = true where id = $1", [IDS.outsider]));
    await asUser(db, IDS.admin, (tx) => tx.query("update public.profiles set is_suspended = false where id = $1", [IDS.outsider]));
    const logs = await logsFor(IDS.outsider);
    expect(logs.map((l) => l.action)).toEqual(["user.suspended", "user.reactivated"]);
    expect(logs.every((l) => l.admin_id === IDS.admin && l.target_type === "user")).toBe(true);
  });

  it("registra verificação de profissional", async () => {
    await asUser(db, IDS.admin, (tx) =>
      tx.query("update public.professional_profiles set is_verified = true where id = $1", [IDS.professional]),
    );
    expect((await logsFor(IDS.professional)).map((l) => l.action)).toContain("professional.verified");
  });

  it("registra criação e alteração de categoria com o que mudou", async () => {
    const category = await asUser(db, IDS.admin, (tx) =>
      one<{ id: string }>(tx, "insert into public.categories (slug, name) values ('teste-audit', 'Teste') returning id"),
    );
    await asUser(db, IDS.admin, (tx) => tx.query("update public.categories set is_active = false where id = $1", [category.id]));
    const logs = await logsFor(category.id);
    expect(logs.map((l) => l.action)).toEqual(["category.created", "category.updated"]);
    expect(logs[1].metadata).toMatchObject({ changes: { is_active: { from: true, to: false } } });
  });

  it("registra mudança manual de status de pedido feita por admin", async () => {
    await asUser(db, IDS.admin, (tx) => tx.query("update public.service_requests set status = 'cancelled' where id = $1", [requestId]));
    const logs = await logsFor(requestId);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "service_request.status_changed", metadata: { from: "open", to: "cancelled" } });
  });

  it("não registra ações de usuários comuns", async () => {
    const before = await one<{ n: number }>(db, "select count(*)::int as n from public.admin_action_logs");
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.professional_profiles set is_active = false where id = $1", [IDS.professional]),
    );
    const after = await one<{ n: number }>(db, "select count(*)::int as n from public.admin_action_logs");
    expect(after.n).toBe(before.n);
  });

  it("é append-only: admin não altera, não apaga e não insere log forjado", async () => {
    await expect(asUser(db, IDS.admin, (tx) => tx.query("update public.admin_action_logs set action = 'x'"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser(db, IDS.admin, (tx) => tx.query("delete from public.admin_action_logs"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(db, IDS.admin, (tx) =>
        tx.query("insert into public.admin_action_logs (admin_id, action, target_type) values ($1, 'forjado', 'user')", [IDS.admin]),
      ),
    ).rejects.toThrow(/permission denied/);
    // Nem com service role (backend) o histórico pode ser reescrito.
    await expect(asServiceRole(db, (tx) => tx.query("delete from public.admin_action_logs"))).rejects.toThrow(/append-only/);
  });

  it("só admin lê o log", async () => {
    expect(await asUser(db, IDS.client, (tx) => rows(tx, "select id from public.admin_action_logs"))).toHaveLength(0);
    expect((await asUser(db, IDS.admin, (tx) => rows(tx, "select id from public.admin_action_logs"))).length).toBeGreaterThan(0);
  });
});
