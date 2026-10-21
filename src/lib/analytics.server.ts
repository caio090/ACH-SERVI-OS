import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeEventMetadata, type ProductEventName } from "@/lib/analytics";

/**
 * Grava um evento de produto com service role. Nunca quebra o fluxo do
 * usuário: sem service role configurado o evento é ignorado, e falhas de
 * gravação só são logadas.
 */
export async function trackServerEvent(
  event: ProductEventName,
  params: { userId?: string | null; anonymousId?: string | null; requestId?: string | null; metadata?: unknown } = {},
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { error } = await createAdminClient()
      .from("product_events")
      .insert({
        event_name: event,
        user_id: params.userId ?? null,
        anonymous_id: params.anonymousId ?? null,
        request_id: params.requestId ?? null,
        metadata: sanitizeEventMetadata(event, params.metadata),
      });
    if (error) console.error(`Evento ${event} não gravado:`, error.message);
  } catch (error) {
    console.error(`Evento ${event} não gravado:`, error);
  }
}
