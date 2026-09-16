"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(params: { conversationId: string; requestId: string; body: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const body = params.body.trim();
  if (!body) return;

  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    throw new Error("Não foi possível enviar a mensagem.");
  }

  revalidatePath(`/pedidos/${params.requestId}/conversa`);
}
