"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReportTargetType } from "@/lib/database.types";

export async function createReport(params: { targetType: ReportTargetType; targetId: string; reason: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  if (!params.reason.trim()) {
    throw new Error("Descreva o motivo da denúncia.");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason.trim(),
  });

  if (error) {
    throw new Error("Não foi possível enviar a denúncia.");
  }
}
