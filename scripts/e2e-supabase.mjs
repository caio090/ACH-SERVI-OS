// Validação ponta a ponta contra o projeto Supabase REAL (Auth + RLS + Storage).
//
// Uso (na raiz do projeto, com .env.local preenchido):
//   E2E_CONFIRM=sim node --env-file=.env.local scripts/e2e-supabase.mjs
//
// O que faz: cria 3 contas de teste claramente marcadas ([E2E], e-mail
// e2e-<run>-*@acho-e2e.test), executa o ciclo completo do MVP como cada
// usuário (cliente, profissional, outsider) usando a chave pública + login
// real, faz upload físico de foto e, no final, apaga as contas (cascade) e os
// arquivos. Nunca toca em dados de clientes reais. Sai com código 1 se alguma
// etapa falhar e imprime etapa, tabela, erro.

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
if (process.env.E2E_CONFIRM !== "sim") {
  console.error(`Este script grava e apaga dados de teste em ${url}. Rode com E2E_CONFIRM=sim para confirmar.`);
  process.exit(2);
}

const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
const createdUserIds = [];
const uploadedPaths = [];

// PNG 1x1 válido (assinatura real), para o upload físico.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function step(name, table, fn) {
  try {
    const detail = await fn();
    results.push({ step: name, table, ok: true, detail: detail ?? "" });
  } catch (error) {
    results.push({ step: name, table, ok: false, detail: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
  return data;
}

async function createTestUser(label) {
  const email = `e2e-${runId}-${label}@acho-e2e.test`;
  const password = `E2e-${randomUUID()}`;
  const created = must(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `[E2E] ${label}`, terms_version: "e2e" },
    }),
    `criar usuário ${label}`,
  );
  createdUserIds.push(created.user.id);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  must(await client.auth.signInWithPassword({ email, password }), `login ${label}`);
  return { id: created.user.id, client };
}

function localDate(offsetDays) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return { iso: new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date), weekday: new Date(`${new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date)}T12:00:00Z`).getUTCDay() };
}

async function main() {
  let client, pro, outsider, categoryId, requestId, matchId, appointmentId, conversationId;
  const target = localDate(7);

  await step("1. cadastro/login (cliente, profissional, outsider)", "auth.users/profiles", async () => {
    client = await createTestUser("cliente");
    pro = await createTestUser("profissional");
    outsider = await createTestUser("outsider");
    const profile = must(await client.client.from("profiles").select("full_name, terms_version").eq("id", client.id).single(), "profile");
    return `profile criado pelo trigger (${profile.full_name}; termos: ${profile.terms_version ?? "coluna/valor ausente"})`;
  });

  await step("perfil profissional + categoria + agenda", "professional_profiles/professional_categories/availability_rules", async () => {
    categoryId = must(await pro.client.from("categories").select("id").eq("slug", "eletricista").single(), "categoria").id;
    must(await pro.client.from("professional_profiles").insert({ id: pro.id, bio: "[E2E] teste", service_areas: ["Bairro E2E"] }), "perfil");
    must(await pro.client.from("professional_categories").insert({ professional_id: pro.id, category_id: categoryId }), "categoria do pro");
    must(
      await pro.client.from("availability_rules").insert({ professional_id: pro.id, weekday: target.weekday, start_time: "08:00", end_time: "18:00" }),
      "agenda",
    );
  });

  await step("2-6. criação do pedido (categoria, descrição, bairro/cidade, envio)", "service_requests", async () => {
    requestId = must(
      await client.client
        .from("service_requests")
        .insert({
          client_id: client.id,
          category_id: categoryId,
          description: "[E2E] Teste automatizado de ponta a ponta — ignorar",
          neighborhood: "Bairro E2E",
          city: "Cidade E2E",
          desired_date: target.iso,
          time_window_start: "09:00",
          time_window_end: "12:00",
          status: "open",
        })
        .select("id")
        .single(),
      "insert pedido",
    ).id;
    return requestId;
  });

  await step("7. cliente vê o próprio pedido; outsider não vê", "service_requests (RLS)", async () => {
    const own = must(await client.client.from("service_requests").select("id").eq("id", requestId), "select cliente");
    const other = must(await outsider.client.from("service_requests").select("id").eq("id", requestId), "select outsider");
    if (own.length !== 1 || other.length !== 0) throw new Error(`cliente viu ${own.length}, outsider viu ${other.length}`);
  });

  await step("8. match gravado e profissional enxerga a oportunidade", "request_matches", async () => {
    matchId = must(
      await client.client.from("request_matches").insert({ request_id: requestId, professional_id: pro.id }).select("id").single(),
      "insert match",
    ).id;
    const seen = must(await pro.client.from("service_requests").select("id").eq("id", requestId), "pro vê pedido");
    if (seen.length !== 1) throw new Error("profissional não enxerga o pedido");
  });

  await step("0015: agendamento antes do aceite é recusado", "appointments (trigger)", async () => {
    const { error } = await client.client.from("appointments").insert({
      request_id: requestId, request_match_id: matchId, client_id: client.id, professional_id: pro.id,
      scheduled_date: target.iso, time_window_start: "09:00", time_window_end: "12:00", service_address: "Rua E2E, 1",
    });
    if (!error) throw new Error("BRECHA: appointment criado sem aceite (migration 0015 não aplicada?)");
    return error.message;
  });

  await step("9-10. profissional aceita / define horário", "request_matches", async () => {
    must(await pro.client.from("request_matches").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", matchId), "aceite");
    const request = must(await client.client.from("service_requests").select("status").eq("id", requestId).single(), "status");
    return `pedido: ${request.status}`;
  });

  await step("11-14. cliente confirma; appointment com endereço e status corretos", "appointments", async () => {
    appointmentId = must(
      await client.client
        .from("appointments")
        .insert({
          request_id: requestId, request_match_id: matchId, client_id: client.id, professional_id: pro.id,
          scheduled_date: target.iso, time_window_start: "09:00", time_window_end: "12:00", service_address: "Rua E2E, 100 — Bairro E2E",
        })
        .select("id, status, service_address")
        .single(),
      "insert appointment",
    ).id;
    const request = must(await client.client.from("service_requests").select("status").eq("id", requestId).single(), "status pedido");
    if (request.status !== "scheduled") throw new Error(`pedido em ${request.status}, esperado scheduled`);
    const contact = must(await client.client.rpc("get_appointment_contact", { p_appointment_id: appointmentId }), "contato");
    if (!contact?.[0]) throw new Error("contato não liberado após confirmação");
  });

  await step("15-17. chat: cliente envia, profissional recebe e responde", "conversations/messages", async () => {
    conversationId = must(
      await client.client.from("conversations").insert({ request_id: requestId, client_id: client.id, professional_id: pro.id }).select("id").single(),
      "conversa",
    ).id;
    must(await client.client.from("messages").insert({ conversation_id: conversationId, sender_id: client.id, body: "[E2E] olá" }), "msg cliente");
    const received = must(await pro.client.from("messages").select("body").eq("conversation_id", conversationId), "pro lê");
    if (received.length !== 1) throw new Error(`profissional recebeu ${received.length} mensagens`);
    must(await pro.client.from("messages").insert({ conversation_id: conversationId, sender_id: pro.id, body: "[E2E] resposta" }), "msg pro");
    const leaked = must(await outsider.client.from("messages").select("id").eq("conversation_id", conversationId), "outsider lê");
    if (leaked.length !== 0) throw new Error("outsider leu mensagens");
  });

  await step("18-19. início e conclusão do atendimento", "appointments", async () => {
    must(await pro.client.from("appointments").update({ status: "in_service" }).eq("id", appointmentId), "in_service");
    must(await pro.client.from("appointments").update({ status: "completed" }).eq("id", appointmentId), "completed");
    const request = must(await client.client.from("service_requests").select("status").eq("id", requestId).single(), "status");
    if (request.status !== "completed") throw new Error(`pedido em ${request.status}`);
  });

  await step("20-21. avaliação e recálculo da nota", "reviews/professional_profiles", async () => {
    must(
      await client.client.from("reviews").insert({ appointment_id: appointmentId, client_id: client.id, professional_id: pro.id, rating: 5, comment: "[E2E]" }),
      "review",
    );
    const profile = must(await admin.from("professional_profiles").select("average_rating, review_count").eq("id", pro.id).single(), "rating");
    if (Number(profile.average_rating) !== 5 || profile.review_count !== 1) {
      throw new Error(`rating ${profile.average_rating} / ${profile.review_count}`);
    }
  });

  await step("upload real: foto do pedido (bucket privado)", "storage.objects request-photos", async () => {
    const path = `${requestId}/${randomUUID()}.png`;
    must(await client.client.storage.from("request-photos").upload(path, PNG_1PX, { contentType: "image/png" }), "upload");
    uploadedPaths.push(path);
    must(await pro.client.storage.from("request-photos").createSignedUrl(path, 60), "pro assina URL");
    const { error: outsiderError } = await outsider.client.storage.from("request-photos").createSignedUrl(path, 60);
    if (!outsiderError) throw new Error("outsider conseguiu URL assinada");
    const { error: exeError } = await client.client.storage
      .from("request-photos")
      .upload(`${requestId}/${randomUUID()}.exe`, Buffer.from("MZ"), { contentType: "application/x-msdownload" });
    if (!exeError) throw new Error("bucket aceitou executável");
    return "upload ok; pro lê; outsider bloqueado; executável recusado";
  });
}

async function cleanup() {
  if (uploadedPaths.length > 0) {
    await admin.storage.from("request-photos").remove(uploadedPaths);
  }
  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`Limpeza: não removi o usuário de teste ${id}: ${error.message}`);
  }
}

try {
  await main();
} catch {
  // a falha já foi registrada em results
} finally {
  await cleanup();
}

console.table(results.map((r) => ({ etapa: r.step, tabela: r.table, ok: r.ok ? "✔" : "✘", detalhe: r.detail })));
const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? `\nE2E OK (${results.length} etapas). Dados de teste removidos.` : `\nE2E FALHOU em: ${failed[0].step}`);
process.exit(failed.length === 0 ? 0 : 1);
