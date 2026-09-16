"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToMatch } from "@/lib/actions/professional";
import { Button } from "@/components/ui/Button";
import { InputField, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

type Mode = "idle" | "decline" | "propose";

export function MatchResponseActions({
  matchId,
  requestId,
  defaultDate,
}: {
  matchId: string;
  requestId: string;
  defaultDate: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function respond(action: "accept" | "decline" | "propose_new_time", formData?: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await respondToMatch({
          matchId,
          requestId,
          action,
          declineReason: formData ? String(formData.get("decline_reason") || "") : undefined,
          proposedDate: formData ? String(formData.get("proposed_date") || "") : undefined,
          proposedStart: formData ? String(formData.get("proposed_start") || "") : undefined,
          proposedEnd: formData ? String(formData.get("proposed_end") || "") : undefined,
        });
        setMode("idle");
        router.refresh();
      } catch {
        setError("Não foi possível enviar sua resposta.");
      }
    });
  }

  if (mode === "decline") {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          respond("decline", new FormData(e.currentTarget));
        }}
      >
        {error && <Alert tone="error">{error}</Alert>}
        <TextareaField id="decline_reason" name="decline_reason" label="Motivo (opcional)" />
        <div className="flex gap-2">
          <Button type="submit" variant="danger" size="sm" isLoading={isPending}>
            Confirmar recusa
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
            Voltar
          </Button>
        </div>
      </form>
    );
  }

  if (mode === "propose") {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          respond("propose_new_time", new FormData(e.currentTarget));
        }}
      >
        {error && <Alert tone="error">{error}</Alert>}
        <InputField id="proposed_date" name="proposed_date" type="date" label="Nova data" defaultValue={defaultDate} required />
        <div className="grid grid-cols-2 gap-3">
          <InputField id="proposed_start" name="proposed_start" type="time" label="Início" required />
          <InputField id="proposed_end" name="proposed_end" type="time" label="Fim" required />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" isLoading={isPending}>
            Enviar sugestão
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
            Voltar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" isLoading={isPending} onClick={() => respond("accept")}>
          Aceitar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setMode("propose")}>
          Sugerir outro horário
        </Button>
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setMode("decline")}>
          Recusar
        </Button>
      </div>
    </div>
  );
}
