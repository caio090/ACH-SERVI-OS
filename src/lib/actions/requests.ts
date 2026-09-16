"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchProfessionals, type MatchCandidateInput } from "@/lib/matching";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MATCHES_PER_REQUEST = 20;

export interface CreateRequestState {
  error?: string;
  requestId?: string;
}

export async function createServiceRequest(
  _prevState: CreateRequestState,
  formData: FormData,
): Promise<CreateRequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa entrar para criar um pedido." };
  }

  const categoryId = String(formData.get("category_id") || "");
  const description = String(formData.get("description") || "").trim();
  const neighborhood = String(formData.get("neighborhood") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const desiredDate = String(formData.get("desired_date") || "");
  const timeWindowStart = String(formData.get("time_window_start") || "");
  const timeWindowEnd = String(formData.get("time_window_end") || "");
  const isUrgent = formData.get("is_urgent") === "on";

  if (!categoryId || !description || !neighborhood || !city || !desiredDate || !timeWindowStart || !timeWindowEnd) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (timeWindowEnd <= timeWindowStart) {
    return { error: "O horário final deve ser depois do horário inicial." };
  }

  const { data: request, error: insertError } = await supabase
    .from("service_requests")
    .insert({
      client_id: user.id,
      category_id: categoryId,
      description,
      neighborhood,
      city,
      desired_date: desiredDate,
      time_window_start: timeWindowStart,
      time_window_end: timeWindowEnd,
      is_urgent: isUrgent,
      status: "open",
    })
    .select("id")
    .single();

  if (insertError || !request) {
    return {
      error: insertError?.message.includes("aguarde")
        ? "Aguarde um instante antes de enviar outro pedido."
        : "Não foi possível criar o pedido. Tente novamente.",
    };
  }

  const photos = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  const photoPaths: string[] = [];

  for (const photo of photos.slice(0, 5)) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type) || photo.size > MAX_PHOTO_BYTES) {
      continue;
    }
    const path = `${request.id}/${Date.now()}-${photo.name}`;
    const { error: uploadError } = await supabase.storage.from("request-photos").upload(path, photo, {
      contentType: photo.type,
    });
    if (!uploadError) {
      photoPaths.push(path);
    }
  }

  if (photoPaths.length > 0) {
    await supabase.from("service_requests").update({ photo_paths: photoPaths }).eq("id", request.id);
  }

  await runMatchingForRequest({
    requestId: request.id,
    categoryId,
    neighborhood,
    desiredDate,
    timeWindowStart,
    timeWindowEnd,
  });

  revalidatePath("/pedidos");
  return { requestId: request.id };
}

/**
 * Roda o matching determinístico (Fase 6) e grava os request_matches.
 * Usa o cliente com service role apenas para LER professional_profiles de
 * outros usuários (a policy de RLS restringe leitura dessa tabela ao próprio
 * dono) — a gravação dos matches usa o cliente autenticado do próprio
 * cliente, respeitando a policy de insert (dono do pedido).
 */
async function runMatchingForRequest(params: {
  requestId: string;
  categoryId: string;
  neighborhood: string;
  desiredDate: string;
  timeWindowStart: string;
  timeWindowEnd: string;
}) {
  const admin = createAdminClient();

  // Feito em etapas (sem embeds aninhados) para não depender de metadados de
  // relacionamento que só existem com um projeto Supabase real linkado.
  const { data: categoryLinks } = await admin
    .from("professional_categories")
    .select("professional_id")
    .eq("category_id", params.categoryId);

  const candidateIds = (categoryLinks ?? []).map((link) => link.professional_id);
  if (candidateIds.length === 0) return;

  const [{ data: professionals }, { data: profiles }, { data: rules }, { data: exceptions }] = await Promise.all([
    admin.from("professional_profiles").select("*").in("id", candidateIds).eq("is_active", true),
    admin.from("profiles").select("id, is_suspended").in("id", candidateIds),
    admin.from("availability_rules").select("*").in("professional_id", candidateIds),
    admin.from("availability_exceptions").select("*").in("professional_id", candidateIds),
  ]);

  if (!professionals || professionals.length === 0) return;

  const suspendedById = new Map((profiles ?? []).map((p) => [p.id, p.is_suspended]));
  const rulesByProfessional = new Map<string, typeof rules>();
  for (const rule of rules ?? []) {
    const list = rulesByProfessional.get(rule.professional_id) ?? [];
    list.push(rule);
    rulesByProfessional.set(rule.professional_id, list);
  }
  const exceptionsByProfessional = new Map<string, typeof exceptions>();
  for (const exception of exceptions ?? []) {
    const list = exceptionsByProfessional.get(exception.professional_id) ?? [];
    list.push(exception);
    exceptionsByProfessional.set(exception.professional_id, list);
  }

  const candidateInputs: MatchCandidateInput[] = professionals.map((c) => ({
    professionalId: c.id,
    categoryIds: [params.categoryId],
    serviceAreas: c.service_areas ?? [],
    isActive: c.is_active,
    isSuspended: Boolean(suspendedById.get(c.id)),
    bio: c.bio ?? "",
    averageRating: c.average_rating ?? 0,
    reviewCount: c.review_count ?? 0,
    responseRate: c.response_rate ?? 0,
    lastAvailabilityUpdate: c.last_availability_update,
    availabilityRules: rulesByProfessional.get(c.id) ?? [],
    availabilityExceptions: exceptionsByProfessional.get(c.id) ?? [],
  }));

  const matches = matchProfessionals(
    {
      categoryId: params.categoryId,
      neighborhood: params.neighborhood,
      desiredDate: params.desiredDate,
      timeWindowStart: params.timeWindowStart,
      timeWindowEnd: params.timeWindowEnd,
    },
    candidateInputs,
  ).slice(0, MAX_MATCHES_PER_REQUEST);

  if (matches.length === 0) return;

  const supabase = await createClient();
  await supabase.from("request_matches").insert(
    matches.map((m) => ({
      request_id: params.requestId,
      professional_id: m.professionalId,
    })),
  );
}

export async function cancelServiceRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase
    .from("service_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("client_id", user.id);

  revalidatePath(`/pedidos/${requestId}`);
  revalidatePath("/pedidos");
}

export async function confirmMatch(params: {
  requestId: string;
  matchId: string;
  professionalId: string;
  scheduledDate: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  serviceAddress: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase
    .from("service_requests")
    .update({ status: "accepted", accepted_match_id: params.matchId })
    .eq("id", params.requestId)
    .eq("client_id", user.id);

  const { error } = await supabase.from("appointments").insert({
    request_id: params.requestId,
    request_match_id: params.matchId,
    client_id: user.id,
    professional_id: params.professionalId,
    scheduled_date: params.scheduledDate,
    time_window_start: params.timeWindowStart,
    time_window_end: params.timeWindowEnd,
    service_address: params.serviceAddress,
  });

  if (error) {
    throw new Error("Não foi possível confirmar o agendamento.");
  }

  revalidatePath(`/pedidos/${params.requestId}`);
  revalidatePath("/pedidos");
}

export async function createReview(params: {
  appointmentId: string;
  professionalId: string;
  rating: number;
  comment: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase.from("reviews").insert({
    appointment_id: params.appointmentId,
    client_id: user.id,
    professional_id: params.professionalId,
    rating: params.rating,
    comment: params.comment,
  });

  if (error) {
    throw new Error("Não foi possível registrar a avaliação.");
  }

  revalidatePath("/pedidos");
}
