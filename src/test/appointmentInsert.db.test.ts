import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, IDS, one, seedRequestWithMatch, type Db, type Tx } from "./db";

function insertAppointment(tx: Tx, params: { requestId: string; matchId: string; clientId?: string; status?: string }) {
  return tx.query(
    `insert into public.appointments
      (request_id, request_match_id, client_id, professional_id, scheduled_date, time_window_start, time_window_end, service_address, status)
     values ($1, $2, $3, $4, current_date + 3, '09:00', '12:00', 'Rua de Teste, 1', $5)
     returning id`,
    [params.requestId, params.matchId, params.clientId ?? IDS.client, IDS.professional, params.status ?? "scheduled"],
  );
}

describe("0015 — criação de agendamento exige aceite do profissional", () => {
  let db: Db;
  let requestId: string;
  let matchId: string;

  beforeEach(async () => {
    db = await createTestDb();
    ({ requestId, matchId } = await seedRequestWithMatch(db));
    await db.query("update public.profiles set phone = '11999990000' where id = $1", [IDS.professional]);
  }, 60_000);

  afterEach(() => db.close());

  it("bloqueia agendamento com match pendente (contato não vaza)", async () => {
    await expect(asUser(db, IDS.client, (tx) => insertAppointment(tx, { requestId, matchId }))).rejects.toThrow(
      /ainda não aceitou/,
    );
    const match = await one<{ status: string }>(db, "select status from public.request_matches where id = $1", [matchId]);
    expect(match.status).toBe("pending");
  });

  it("bloqueia agendamento com match recusado", async () => {
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.request_matches set status = 'declined' where id = $1", [matchId]),
    );
    await expect(asUser(db, IDS.client, (tx) => insertAppointment(tx, { requestId, matchId }))).rejects.toThrow(
      /ainda não aceitou/,
    );
  });

  it("bloqueia agendamento em pedido de outra pessoa", async () => {
    await createUser(db, { id: IDS.outsider, email: "outsider@example.com" });
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.request_matches set status = 'accepted' where id = $1", [matchId]),
    );
    await expect(
      asUser(db, IDS.outsider, (tx) => insertAppointment(tx, { requestId, matchId, clientId: IDS.outsider })),
    ).rejects.toThrow(/cliente dono do pedido/);
  });

  it("permite após aceite e força status/liberação de contato coerentes", async () => {
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.request_matches set status = 'accepted' where id = $1", [matchId]),
    );
    const created = await asUser(db, IDS.client, async (tx) =>
      (await insertAppointment(tx, { requestId, matchId, status: "completed" })).rows[0] as { id: string },
    );
    const appointment = await one<{ status: string }>(db, "select status from public.appointments where id = $1", [created.id]);
    expect(appointment.status).toBe("scheduled");

    const contact = await asUser(db, IDS.client, (tx) =>
      one<{ phone: string }>(tx, "select phone from public.get_appointment_contact($1)", [created.id]),
    );
    expect(contact.phone).toBe("11999990000");
  });

  it("permite confirmar uma proposta de novo horário", async () => {
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.request_matches set status = 'proposed_new_time' where id = $1", [matchId]),
    );
    await expect(asUser(db, IDS.client, (tx) => insertAppointment(tx, { requestId, matchId }))).resolves.toBeDefined();
  });
});
