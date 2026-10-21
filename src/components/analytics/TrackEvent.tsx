"use client";

import { useEffect } from "react";
import type { ClientEventName, EventMetadata } from "@/lib/analytics";
import { trackClientEvent } from "@/lib/analytics.client";

/** Registra um evento uma vez quando a página é exibida. */
export function TrackEvent({ event, metadata }: { event: ClientEventName; metadata?: EventMetadata }) {
  useEffect(() => {
    trackClientEvent(event, metadata);
    // Só na montagem: metadata é estável para a mesma página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
