"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionError, actionOk, type ActionResult } from "@/lib/actionResult";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { isReadinessStatus } from "@/lib/betaReadiness";

// O registro de auditoria (admin_action_logs) é gravado pelo próprio banco,
// via triggers da migration 0017 — não depende destas actions e não pode ser
// pulado por quem chama a API diretamente.

type AdminContext =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; adminId: string }
  | { ok: false; result: ActionResult };

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, result: actionError("Você precisa entrar.") };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, result: actionError("Acesso restrito a administradores.") };

  const limit = await checkRateLimit("admin_action", user.id);
  if (!limit.ok) return { ok: false, result: actionError(limit.error, limit.retryAfterSeconds) };

  return { ok: true, supabase, adminId: user.id };
}

export async function toggleUserSuspension(userId: string, suspend: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;
  if (userId === ctx.adminId) return actionError("Você não pode suspender a própria conta.");

  const { error } = await ctx.supabase.from("profiles").update({ is_suspended: suspend }).eq("id", userId);
  if (error) return actionError("Não foi possível atualizar o usuário.");
  revalidatePath("/admin/usuarios");
  return actionOk();
}

export async function toggleProfessionalVerified(professionalId: string, verified: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase.from("professional_profiles").update({ is_verified: verified }).eq("id", professionalId);
  if (error) return actionError("Não foi possível atualizar o profissional.");
  revalidatePath("/admin/profissionais");
  return actionOk();
}

export async function toggleCategoryActive(categoryId: string, isActive: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase.from("categories").update({ is_active: isActive }).eq("id", categoryId);
  if (error) return actionError("Não foi possível atualizar a categoria.");
  revalidatePath("/admin/categorias");
  return actionOk();
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const icon = String(formData.get("icon") || "🛠️").trim().slice(0, 16) || "🛠️";

  if (!name || !slug) return actionError("Nome e slug são obrigatórios.");

  const { error } = await ctx.supabase.from("categories").insert({ name, slug, icon });
  if (error) {
    return actionError(error.code === "23505" ? "Já existe uma categoria com esse slug." : "Não foi possível criar a categoria.");
  }
  revalidatePath("/admin/categorias");
  return actionOk();
}

export async function resolveReport(reportId: string, status: "reviewed" | "dismissed" | "actioned"): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase
    .from("reports")
    .update({ status, resolved_by: ctx.adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) return actionError("Não foi possível atualizar a denúncia.");
  revalidatePath("/admin/denuncias");
  return actionOk();
}

export async function updateReadinessItem(itemId: string, status: string, notes: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;
  if (!isReadinessStatus(status)) return actionError("Status inválido.");

  const { error } = await ctx.supabase
    .from("beta_readiness_items")
    .update({ status, notes: notes.trim().slice(0, 500) })
    .eq("id", itemId);
  if (error) return actionError("Não foi possível atualizar o item.");
  revalidatePath("/admin/prontidao");
  revalidatePath("/admin");
  return actionOk();
}

export async function deleteReview(reviewId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return actionError("Não foi possível remover a avaliação.");
  revalidatePath("/admin/avaliacoes");
  return actionOk();
}
