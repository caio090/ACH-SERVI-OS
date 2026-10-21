"use client";

import { useState } from "react";
import { updateReadinessItem } from "@/lib/actions/admin";
import { READINESS_STATUSES, READINESS_STATUS_LABELS, type ReadinessStatus } from "@/lib/betaReadiness";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function ReadinessItemForm({ id, status, notes }: { id: string; status: ReadinessStatus; notes: string }) {
  const { run, isPending, error } = useActionRunner();
  const [currentStatus, setCurrentStatus] = useState<ReadinessStatus>(status);
  const [currentNotes, setCurrentNotes] = useState(notes);
  const changed = currentStatus !== status || currentNotes !== notes;

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => updateReadinessItem(id, currentStatus, currentNotes));
      }}
    >
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status
      </label>
      <select
        id={`status-${id}`}
        value={currentStatus}
        onChange={(event) => setCurrentStatus(event.target.value as ReadinessStatus)}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      >
        {READINESS_STATUSES.map((value) => (
          <option key={value} value={value}>
            {READINESS_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`notes-${id}`}>
        Nota
      </label>
      <input
        id={`notes-${id}`}
        value={currentNotes}
        maxLength={500}
        placeholder="Nota (opcional)"
        onChange={(event) => setCurrentNotes(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <Button type="submit" size="sm" variant="secondary" isLoading={isPending} disabled={!changed}>
        Salvar
      </Button>
      <ActionError error={error} />
    </form>
  );
}
