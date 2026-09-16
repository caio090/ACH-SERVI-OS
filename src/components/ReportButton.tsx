"use client";

import { useState, useTransition } from "react";
import { createReport } from "@/lib/actions/reports";
import type { ReportTargetType } from "@/lib/database.types";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return <p className="text-xs text-neutral-500">Denúncia enviada. Nossa equipe vai analisar.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-neutral-400 hover:text-red-600">
        Denunciar
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await createReport({ targetType, targetId, reason: String(formData.get("reason") || "") });
            setSent(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível enviar.");
          }
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <TextareaField id="reason" name="reason" label="Motivo da denúncia" required />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger" isLoading={isPending}>
          Enviar denúncia
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
