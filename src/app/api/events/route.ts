import { handleEventsRequest } from "@/lib/eventsEndpoint";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { trackServerEvent } from "@/lib/analytics.server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleEventsRequest(request, {
    checkRateLimit: () => checkRateLimit("event_track"),
    getUserId: async () => {
      if (!hasPublicSupabaseConfig()) return null;
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    record: (payload, userId) =>
      trackServerEvent(payload.event, { userId, anonymousId: payload.anonymousId, metadata: payload.metadata }),
  });
}
