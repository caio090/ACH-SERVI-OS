"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionError, actionOk, type ActionResult } from "@/lib/actionResult";
import { checkRateLimit } from "@/lib/rateLimit.server";

const MAX_MESSAGE_LENGTH = 2000;

export async function sendMessage(params: { conversationId: string; requestId: string; body: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Você precisa entrar.");

  const body = params.body.trim();
  if (!body) return actionError("Escreva uma mensagem.");
  if (body.length > MAX_MESSAGE_LENGTH) {
    return actionError(`A mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const limit = await checkRateLimit("message_send", user.id);
  if (!limit.ok) return actionError(limit.error, limit.retryAfterSeconds);

  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    return actionError(
      error.message.includes("limite de mensagens")
        ? "Você enviou muitas mensagens seguidas. Aguarde um instante."
        : "Não foi possível enviar a mensagem.",
    );
  }

  revalidatePath(`/pedidos/${params.requestId}/conversa`);
  return actionOk();
}
