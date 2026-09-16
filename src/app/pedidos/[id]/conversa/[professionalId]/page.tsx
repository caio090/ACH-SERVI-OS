import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MessageRow, ServiceRequestRow } from "@/lib/database.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageForm } from "./MessageForm";

export default async function ConversationPage({
  params,
}: {
  params: { id: string; professionalId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect=/pedidos/${params.id}/conversa/${params.professionalId}`);
  }

  const { data: request } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<ServiceRequestRow>();

  if (!request) notFound();

  const isClient = user!.id === request.client_id;
  const isProfessional = user!.id === params.professionalId;

  if (!isClient && !isProfessional) {
    notFound();
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("request_id", params.id)
    .eq("professional_id", params.professionalId)
    .maybeSingle();

  if (!conversation) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ request_id: params.id, client_id: request.client_id, professional_id: params.professionalId })
      .select("*")
      .single();

    if (error || !created) {
      return (
        <EmptyState icon="⚠️" title="Não foi possível abrir a conversa" description="Tente novamente em instantes." />
      );
    }
    conversation = created;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at")
    .returns<MessageRow[]>();

  const { data: clientNameRows } = await supabase.rpc("get_request_client_name", { p_request_id: params.id });
  const { data: professionalRows } = await supabase
    .from("public_professional_profiles")
    .select("full_name")
    .eq("id", params.professionalId)
    .maybeSingle();

  const counterpartName = isClient
    ? professionalRows?.full_name ?? "Profissional"
    : clientNameRows?.[0]?.full_name ?? "Cliente";

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col gap-3 py-2 md:h-[calc(100vh-220px)]">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Conversa com {counterpartName}</h1>
        <p className="text-xs text-neutral-500">
          Dados de contato pessoal só são liberados após o agendamento ser confirmado.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-3">
        {(!messages || messages.length === 0) && (
          <EmptyState icon="💬" title="Nenhuma mensagem ainda" description="Envie a primeira mensagem." />
        )}
        <ul className="flex flex-col gap-2">
          {messages?.map((message) => {
            const mine = message.sender_id === user!.id;
            return (
              <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-brand-500 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {message.body}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <MessageForm conversationId={conversation.id} requestId={params.id} />
    </div>
  );
}
