"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReportTargetType } from "@/lib/database.types";
import { actionError, actionOk, type ActionResult } from "@/lib/actionResult";
import { checkRateLimit } from "@/lib/rateLimit.server";

export async function createReport(params: { targetType: ReportTargetType; targetId: string; reason: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Você precisa entrar.");

  const reason = params.reason.trim();
  if (!reason) {
    return actionError("Descreva o motivo da denúncia.");
  }

  const limit = await checkRateLimit("report_create", user.id);
  if (!limit.ok) return actionError(limit.error, limit.retryAfterSeconds);

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: reason.slice(0, 1000),
  });

  if (error) {
    return actionError(
      error.message.includes("limite de denúncias")
        ? "Você enviou muitas denúncias recentemente. Tente novamente mais tarde."
        : "Não foi possível enviar a denúncia.",
    );
  }
  return actionOk();
}
