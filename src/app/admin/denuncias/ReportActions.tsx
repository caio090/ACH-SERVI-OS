"use client";

import { resolveReport } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function ReportActions({ reportId }: { reportId: string }) {
  const { run, isPending, error } = useActionRunner();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" isLoading={isPending} onClick={() => run(() => resolveReport(reportId, "actioned"))}>
          Marcar ação tomada
        </Button>
        <Button size="sm" variant="ghost" isLoading={isPending} onClick={() => run(() => resolveReport(reportId, "dismissed"))}>
          Arquivar
        </Button>
      </div>
      <ActionError error={error} />
    </div>
  );
}
