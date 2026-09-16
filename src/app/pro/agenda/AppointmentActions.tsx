"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatus } from "@/lib/actions/professional";
import { Button } from "@/components/ui/Button";
import type { AppointmentStatus } from "@/lib/database.types";

export function AppointmentActions({
  appointmentId,
  requestId,
  status,
}: {
  appointmentId: string;
  requestId: string;
  status: AppointmentStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update(next: "in_service" | "completed" | "cancelled") {
    startTransition(async () => {
      await updateAppointmentStatus({ appointmentId, requestId, status: next });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "scheduled" && (
        <Button size="sm" variant="secondary" isLoading={isPending} onClick={() => update("in_service")}>
          Marcar em atendimento
        </Button>
      )}
      {status === "in_service" && (
        <Button size="sm" isLoading={isPending} onClick={() => update("completed")}>
          Concluir atendimento
        </Button>
      )}
      {(status === "scheduled" || status === "in_service") && (
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" isLoading={isPending} onClick={() => update("cancelled")}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
