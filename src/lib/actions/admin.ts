"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("not_admin");

  return { supabase, adminId: user.id };
}

async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
) {
  await supabase.from("admin_action_logs").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId });
}

export async function toggleUserSuspension(userId: string, suspend: boolean) {
  const { supabase, adminId } = await requireAdminClient();
  await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", userId);
  await logAdminAction(supabase, adminId, suspend ? "suspend_user" : "reactivate_user", "user", userId);
  revalidatePath("/admin/usuarios");
}

export async function toggleProfessionalVerified(professionalId: string, verified: boolean) {
  const { supabase, adminId } = await requireAdminClient();
  await supabase.from("professional_profiles").update({ is_verified: verified }).eq("id", professionalId);
  await logAdminAction(supabase, adminId, verified ? "verify_professional" : "unverify_professional", "professional", professionalId);
  revalidatePath("/admin/profissionais");
}

export async function toggleCategoryActive(categoryId: string, isActive: boolean) {
  const { supabase, adminId } = await requireAdminClient();
  await supabase.from("categories").update({ is_active: isActive }).eq("id", categoryId);
  await logAdminAction(supabase, adminId, isActive ? "activate_category" : "deactivate_category", "category", categoryId);
  revalidatePath("/admin/categorias");
}

export async function createCategory(formData: FormData) {
  const { supabase, adminId } = await requireAdminClient();
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const icon = String(formData.get("icon") || "🛠️");

  if (!name || !slug) throw new Error("Nome e slug são obrigatórios.");

  const { data } = await supabase.from("categories").insert({ name, slug, icon }).select("id").single();
  await logAdminAction(supabase, adminId, "create_category", "category", data?.id ?? null);
  revalidatePath("/admin/categorias");
}

export async function resolveReport(reportId: string, status: "reviewed" | "dismissed" | "actioned") {
  const { supabase, adminId } = await requireAdminClient();
  await supabase
    .from("reports")
    .update({ status, resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  await logAdminAction(supabase, adminId, `resolve_report_${status}`, "report", reportId);
  revalidatePath("/admin/denuncias");
}

export async function deleteReview(reviewId: string) {
  const { supabase, adminId } = await requireAdminClient();
  await supabase.from("reviews").delete().eq("id", reviewId);
  await logAdminAction(supabase, adminId, "delete_review", "review", reviewId);
  revalidatePath("/admin/avaliacoes");
}
