"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMatch } from "@/lib/actions/requests";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ConfirmMatchForm({
  requestId,
  matchId,
  professionalId,
  defaultDate,
  defaultStart,
  defaultEnd,
}: {
  requestId: string;
  matchId: string;
  professionalId: string;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="w-fit">
        Confirmar este profissional
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await confirmMatch({
              requestId,
              matchId,
              professionalId,
              scheduledDate: String(formData.get("scheduled_date")),
              timeWindowStart: String(formData.get("time_window_start")),
              timeWindowEnd: String(formData.get("time_window_end")),
              serviceAddress: String(formData.get("service_address")),
            });
            router.refresh();
          } catch {
            setError("Não foi possível confirmar. Tente novamente.");
          }
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <InputField id="scheduled_date" name="scheduled_date" type="date" label="Data" defaultValue={defaultDate} required />
      <div className="grid grid-cols-2 gap-3">
        <InputField
          id="time_window_start"
          name="time_window_start"
          type="time"
          label="Início"
          defaultValue={defaultStart}
          required
        />
        <InputField
          id="time_window_end"
          name="time_window_end"
          type="time"
          label="Fim"
          defaultValue={defaultEnd}
          required
        />
      </div>
      <InputField
        id="service_address"
        name="service_address"
        label="Endereço do atendimento"
        placeholder="Rua, número, complemento"
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isPending}>
          Confirmar agendamento
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
