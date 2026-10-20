"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidProfessionalAppointmentTransition } from "@/lib/appointmentTransitions";
import { actionError, actionOk, type ActionResult } from "@/lib/actionResult";
import { buildImageObjectPath, getUploadedFiles, validateImageFile } from "@/lib/uploads";

export interface ProfessionalProfileState {
  error?: string;
  success?: boolean;
}

export async function upsertProfessionalProfile(
  _prevState: ProfessionalProfileState,
  formData: FormData,
): Promise<ProfessionalProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa entrar." };

  const bio = String(formData.get("bio") || "").trim();
  const serviceAreas = String(formData.get("service_areas") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryIds = formData.getAll("category_ids").map(String).filter(Boolean);
  const radius = formData.get("service_radius_km");

  if (categoryIds.length === 0) {
    return { error: "Selecione ao menos uma categoria." };
  }
  if (serviceAreas.length === 0) {
    return { error: "Informe ao menos um bairro/região atendida." };
  }

  const { error: upsertError } = await supabase.from("professional_profiles").upsert({
    id: user.id,
    bio,
    service_areas: serviceAreas,
    service_radius_km: radius ? Number(radius) : null,
    last_availability_update: new Date().toISOString(),
  });

  if (upsertError) {
    return { error: "Não foi possível salvar o perfil profissional." };
  }

  await supabase.from("professional_categories").delete().eq("professional_id", user.id);
  if (categoryIds.length > 0) {
    await supabase
      .from("professional_categories")
      .insert(categoryIds.map((category_id) => ({ professional_id: user.id, category_id })));
  }

  revalidatePath("/pro/perfil");
  revalidatePath("/pro/painel");
  return { success: true };
}

export async function togglePauseNewRequests(isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase.from("professional_profiles").update({ is_active: isActive }).eq("id", user.id);
  revalidatePath("/pro/perfil");
  revalidatePath("/pro/painel");
}

export async function respondToMatch(params: {
  matchId: string;
  requestId: string;
  action: "accept" | "decline" | "propose_new_time";
  declineReason?: string;
  proposedDate?: string;
  proposedStart?: string;
  proposedEnd?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const baseUpdate = { responded_at: new Date().toISOString() };

  const update =
    params.action === "accept"
      ? { ...baseUpdate, status: "accepted" as const }
      : params.action === "decline"
        ? { ...baseUpdate, status: "declined" as const, decline_reason: params.declineReason ?? null }
        : {
            ...baseUpdate,
            status: "proposed_new_time" as const,
            proposed_date: params.proposedDate,
            proposed_time_window_start: params.proposedStart,
            proposed_time_window_end: params.proposedEnd,
          };

  const { error } = await supabase
    .from("request_matches")
    .update(update)
    .eq("id", params.matchId)
    .eq("professional_id", user.id);

  if (error) {
    throw new Error("Não foi possível responder ao pedido.");
  }

  revalidatePath("/pro/painel");
  revalidatePath(`/pedidos/${params.requestId}`);
}

// O cliente só pode cancelar e não usa esta action pela UI atual — ver
// AppointmentActions.tsx (exclusiva do profissional).
export async function updateAppointmentStatus(params: {
  appointmentId: string;
  requestId: string;
  status: "in_service" | "completed" | "cancelled" | "no_show";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("status, professional_id")
    .eq("id", params.appointmentId)
    .maybeSingle();

  if (!appointment) {
    throw new Error("Atendimento não encontrado.");
  }
  if (appointment.professional_id !== user.id) {
    throw new Error("Apenas o profissional responsável pode atualizar este atendimento.");
  }
  if (!isValidProfessionalAppointmentTransition(appointment.status, params.status)) {
    throw new Error("Essa transição de status não é permitida para o atendimento atual.");
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: params.status })
    .eq("id", params.appointmentId);

  if (error) {
    throw new Error("Não foi possível atualizar o atendimento.");
  }

  revalidatePath("/pro/painel");
  revalidatePath("/pro/agenda");
  revalidatePath(`/pedidos/${params.requestId}`);
}

export async function addAvailabilityRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase.from("availability_rules").insert({
    professional_id: user.id,
    weekday: Number(formData.get("weekday")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
  });

  await supabase
    .from("professional_profiles")
    .update({ last_availability_update: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/pro/agenda");
}

export async function deleteAvailabilityRule(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase.from("availability_rules").delete().eq("id", id).eq("professional_id", user.id);
  revalidatePath("/pro/agenda");
}

export async function addAvailabilityException(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const isAvailable = formData.get("is_available") === "on";

  await supabase.from("availability_exceptions").insert({
    professional_id: user.id,
    exception_date: String(formData.get("exception_date")),
    is_available: isAvailable,
    start_time: isAvailable ? String(formData.get("start_time") || "") || null : null,
    end_time: isAvailable ? String(formData.get("end_time") || "") || null : null,
    reason: String(formData.get("reason") || "") || null,
  });

  await supabase
    .from("professional_profiles")
    .update({ last_availability_update: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/pro/agenda");
}

export async function deleteAvailabilityException(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  await supabase.from("availability_exceptions").delete().eq("id", id).eq("professional_id", user.id);
  revalidatePath("/pro/agenda");
}

export async function addPortfolioItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Você precisa entrar.");

  const [file] = getUploadedFiles(formData, "photo");
  if (!file) {
    return actionError("Selecione uma foto.");
  }
  const validation = await validateImageFile(file);
  if (!validation.ok) {
    return actionError(validation.error);
  }

  const path = buildImageObjectPath(user.id, validation.extension);
  const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, validation.bytes, {
    contentType: validation.mime,
  });
  if (uploadError) {
    return actionError("Não foi possível enviar a foto.");
  }

  const { error: insertError } = await supabase.from("portfolio_items").insert({
    professional_id: user.id,
    title: String(formData.get("title") || "").trim().slice(0, 120),
    description: String(formData.get("description") || "").trim().slice(0, 500),
    photo_path: path,
  });
  if (insertError) {
    // Não deixa arquivo órfão no Storage se o registro não foi criado.
    await supabase.storage.from("portfolio").remove([path]);
    return actionError("Não foi possível salvar a foto no portfólio.");
  }

  revalidatePath("/pro/portfolio");
  return actionOk();
}

export async function deletePortfolioItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Você precisa entrar.");

  const { data: item } = await supabase
    .from("portfolio_items")
    .select("photo_path")
    .eq("id", id)
    .eq("professional_id", user.id)
    .maybeSingle();
  if (!item) {
    return actionError("Foto não encontrada.");
  }

  const { error } = await supabase.from("portfolio_items").delete().eq("id", id).eq("professional_id", user.id);
  if (error) {
    return actionError("Não foi possível remover a foto.");
  }
  // A policy portfolio_write_own só permite remover objetos da própria pasta.
  await supabase.storage.from("portfolio").remove([item.photo_path]);

  revalidatePath("/pro/portfolio");
  return actionOk();
}
