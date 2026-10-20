import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, createTestDb, createUser, IDS, one, rows, type Db } from "./db";

/**
 * Ciclo completo do MVP contra Postgres real com todas as migrations, RLS,
 * triggers e RPCs — executando cada passo como o usuário que o faria na
 * aplicação. Os testes são sequenciais: cada um depende do estado do anterior.
 */
describe("fluxo do MVP sob RLS (Postgres local com as migrations)", () => {
  let db: Db;
  let categoryId: string;
  let requestId: string;
  let matchId: string;
  let appointmentId: string;
  let conversationId: string;

  beforeAll(async () => {
    db = await createTestDb();
    await createUser(db, { id: IDS.client, email: "cliente.teste@example.com", fullName: "Cliente Teste" });
    await createUser(db, { id: IDS.professional, email: "pro.teste@example.com", fullName: "Profissional Teste" });
    await createUser(db, { id: IDS.outsider, email: "outsider.teste@example.com" });
    await db.query("update public.profiles set phone = '11999990000' where id = $1", [IDS.professional]);
    categoryId = (await one<{ id: string }>(db, "select id from public.categories where slug = 'eletricista'")).id;
  }, 60_000);

  afterAll(() => db.close());

  it("1-3. profissional monta perfil, categoria e agenda", async () => {
    await asUser(db, IDS.professional, async (tx) => {
      await tx.query("insert into public.professional_profiles (id, bio, service_areas) values ($1, 'Eletricista', '{Centro}')", [
        IDS.professional,
      ]);
      await tx.query("insert into public.professional_categories (professional_id, category_id) values ($1, $2)", [
        IDS.professional,
        categoryId,
      ]);
      await tx.query(
        "insert into public.availability_rules (professional_id, weekday, start_time, end_time) values ($1, 1, '08:00', '18:00')",
        [IDS.professional],
      );
    });

    const publicPros = await asAnon(db, (tx) => rows<{ id: string }>(tx, "select id from public.public_professional_profiles"));
    expect(publicPros.map((p) => p.id)).toContain(IDS.professional);
  });

  it("profissional não consegue se autoverificar nem forjar nota", async () => {
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.professional_profiles set is_verified = true, average_rating = 5 where id = $1", [IDS.professional]),
    );
    const profile = await one<{ is_verified: boolean; average_rating: string }>(
      db,
      "select is_verified, average_rating from public.professional_profiles where id = $1",
      [IDS.professional],
    );
    expect(profile.is_verified).toBe(false);
    expect(Number(profile.average_rating)).toBe(0);
  });

  it("4-7. cliente cria pedido e vê o próprio pedido; outsider não vê", async () => {
    requestId = await asUser(db, IDS.client, async (tx) => {
      const created = await one<{ id: string }>(
        tx,
        `insert into public.service_requests
          (client_id, category_id, description, neighborhood, city, desired_date, time_window_start, time_window_end, status)
         values ($1, $2, 'Tomada da cozinha parou de funcionar', 'Centro', 'Cidade Piloto', current_date + 7, '09:00', '12:00', 'open')
         returning id`,
        [IDS.client, categoryId],
      );
      return created.id;
    });

    const own = await asUser(db, IDS.client, (tx) => rows(tx, "select id from public.service_requests"));
    expect(own).toHaveLength(1);
    const outsider = await asUser(db, IDS.outsider, (tx) => rows(tx, "select id from public.service_requests"));
    expect(outsider).toHaveLength(0);
  });

  it("cooldown impede pedido em sequência do mesmo cliente", async () => {
    await expect(
      asUser(db, IDS.client, (tx) =>
        tx.query(
          `insert into public.service_requests
            (client_id, category_id, description, neighborhood, city, desired_date, time_window_start, time_window_end, status)
           values ($1, $2, 'Outro pedido logo em seguida', 'Centro', 'Cidade Piloto', current_date + 7, '09:00', '12:00', 'open')`,
          [IDS.client, categoryId],
        ),
      ),
    ).rejects.toThrow(/aguarde/);
  });

  it("8. matching grava o match e o profissional enxerga a oportunidade", async () => {
    matchId = await asUser(db, IDS.client, async (tx) =>
      (
        await one<{ id: string }>(
          tx,
          "insert into public.request_matches (request_id, professional_id) values ($1, $2) returning id",
          [requestId, IDS.professional],
        )
      ).id,
    );

    const visible = await asUser(db, IDS.professional, (tx) =>
      rows<{ id: string }>(tx, "select id from public.service_requests where id = $1", [requestId]),
    );
    expect(visible).toHaveLength(1);

    const clientName = await asUser(db, IDS.professional, (tx) =>
      one<{ full_name: string }>(tx, "select full_name from public.get_request_client_name($1)", [requestId]),
    );
    expect(clientName.full_name).toBe("Cliente Teste");

    await expect(
      asUser(db, IDS.outsider, (tx) => tx.query("select * from public.get_request_client_name($1)", [requestId])),
    ).rejects.toThrow(/acesso negado/);
  });

  it("9-10. profissional aceita e o pedido passa para 'reviewing'", async () => {
    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.request_matches set status = 'accepted', responded_at = now() where id = $1", [matchId]),
    );
    const request = await one<{ status: string }>(db, "select status from public.service_requests where id = $1", [requestId]);
    expect(request.status).toBe("reviewing");
  });

  it("11-14. cliente confirma: appointment criado com endereço e pedido 'scheduled'", async () => {
    appointmentId = await asUser(db, IDS.client, async (tx) => {
      await tx.query("update public.service_requests set status = 'accepted', accepted_match_id = $2 where id = $1", [
        requestId,
        matchId,
      ]);
      return (
        await one<{ id: string }>(
          tx,
          `insert into public.appointments
            (request_id, request_match_id, client_id, professional_id, scheduled_date, time_window_start, time_window_end, service_address)
           values ($1, $2, $3, $4, current_date + 7, '09:00', '12:00', 'Rua de Teste, 100 — Centro')
           returning id`,
          [requestId, matchId, IDS.client, IDS.professional],
        )
      ).id;
    });

    const appointment = await one<{ status: string; service_address: string }>(
      db,
      "select status, service_address from public.appointments where id = $1",
      [appointmentId],
    );
    expect(appointment).toEqual({ status: "scheduled", service_address: "Rua de Teste, 100 — Centro" });

    const request = await one<{ status: string; accepted_match_id: string }>(
      db,
      "select status, accepted_match_id from public.service_requests where id = $1",
      [requestId],
    );
    expect(request).toEqual({ status: "scheduled", accepted_match_id: matchId });

    const contact = await asUser(db, IDS.client, (tx) =>
      one<{ phone: string }>(tx, "select phone from public.get_appointment_contact($1)", [appointmentId]),
    );
    expect(contact.phone).toBe("11999990000");

    await expect(
      asUser(db, IDS.outsider, (tx) => tx.query("select * from public.get_appointment_contact($1)", [appointmentId])),
    ).rejects.toThrow(/acesso negado/);
  });

  it("15-17. chat: cliente envia, profissional recebe e responde; outsider não lê", async () => {
    conversationId = await asUser(db, IDS.client, async (tx) =>
      (
        await one<{ id: string }>(
          tx,
          "insert into public.conversations (request_id, client_id, professional_id) values ($1, $2, $3) returning id",
          [requestId, IDS.client, IDS.professional],
        )
      ).id,
    );

    await asUser(db, IDS.client, (tx) =>
      tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Olá, confirmado?')", [
        conversationId,
        IDS.client,
      ]),
    );

    const received = await asUser(db, IDS.professional, (tx) =>
      rows<{ body: string }>(tx, "select body from public.messages where conversation_id = $1", [conversationId]),
    );
    expect(received.map((m) => m.body)).toEqual(["Olá, confirmado?"]);

    await asUser(db, IDS.professional, (tx) =>
      tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Confirmado!')", [
        conversationId,
        IDS.professional,
      ]),
    );

    const outsiderView = await asUser(db, IDS.outsider, (tx) => rows(tx, "select id from public.messages"));
    expect(outsiderView).toHaveLength(0);

    await expect(
      asUser(db, IDS.outsider, (tx) =>
        tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'intruso')", [
          conversationId,
          IDS.outsider,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cliente não pode iniciar/concluir o atendimento", async () => {
    await expect(
      asUser(db, IDS.client, (tx) => tx.query("update public.appointments set status = 'completed' where id = $1", [appointmentId])),
    ).rejects.toThrow(/cliente só pode cancelar/);
  });

  it("18-19. profissional inicia e conclui; pedido acompanha", async () => {
    await expect(
      asUser(db, IDS.professional, (tx) =>
        tx.query("update public.appointments set status = 'completed' where id = $1", [appointmentId]),
      ),
    ).rejects.toThrow(/transição de status inválida/);

    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.appointments set status = 'in_service' where id = $1", [appointmentId]),
    );
    expect((await one<{ status: string }>(db, "select status from public.service_requests where id = $1", [requestId])).status).toBe(
      "in_service",
    );

    await asUser(db, IDS.professional, (tx) =>
      tx.query("update public.appointments set status = 'completed' where id = $1", [appointmentId]),
    );
    const appointment = await one<{ status: string; completed_at: string | null }>(
      db,
      "select status, completed_at from public.appointments where id = $1",
      [appointmentId],
    );
    expect(appointment.status).toBe("completed");
    expect(appointment.completed_at).not.toBeNull();
    expect((await one<{ status: string }>(db, "select status from public.service_requests where id = $1", [requestId])).status).toBe(
      "completed",
    );
  });

  it("20-21. cliente avalia e a nota do profissional é recalculada", async () => {
    await expect(
      asUser(db, IDS.outsider, (tx) =>
        tx.query(
          "insert into public.reviews (appointment_id, client_id, professional_id, rating) values ($1, $2, $3, 1)",
          [appointmentId, IDS.outsider, IDS.professional],
        ),
      ),
    ).rejects.toThrow();

    await asUser(db, IDS.client, (tx) =>
      tx.query(
        "insert into public.reviews (appointment_id, client_id, professional_id, rating, comment) values ($1, $2, $3, 4, 'Bom serviço')",
        [appointmentId, IDS.client, IDS.professional],
      ),
    );

    const profile = await one<{ average_rating: string; review_count: number }>(
      db,
      "select average_rating, review_count from public.professional_profiles where id = $1",
      [IDS.professional],
    );
    expect(Number(profile.average_rating)).toBe(4);
    expect(profile.review_count).toBe(1);

    await expect(
      asUser(db, IDS.client, (tx) =>
        tx.query("insert into public.reviews (appointment_id, client_id, professional_id, rating) values ($1, $2, $3, 5)", [
          appointmentId,
          IDS.client,
          IDS.professional,
        ]),
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("storage: fotos do pedido só para dono e profissional notificado", async () => {
    const path = `${requestId}/foto.jpg`;
    await asUser(db, IDS.client, (tx) =>
      tx.query("insert into storage.objects (bucket_id, name, owner) values ('request-photos', $1, $2)", [path, IDS.client]),
    );

    await expect(
      asUser(db, IDS.outsider, (tx) =>
        tx.query("insert into storage.objects (bucket_id, name, owner) values ('request-photos', $1, $2)", [
          `${requestId}/intruso.jpg`,
          IDS.outsider,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);

    const proView = await asUser(db, IDS.professional, (tx) =>
      rows(tx, "select name from storage.objects where bucket_id = 'request-photos'"),
    );
    expect(proView).toHaveLength(1);
    const outsiderView = await asUser(db, IDS.outsider, (tx) =>
      rows(tx, "select name from storage.objects where bucket_id = 'request-photos'"),
    );
    expect(outsiderView).toHaveLength(0);
  });
});
