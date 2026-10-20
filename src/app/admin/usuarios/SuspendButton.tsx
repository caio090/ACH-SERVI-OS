"use client";

import { toggleUserSuspension } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function SuspendButton({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const { run, isPending, error } = useActionRunner();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={isSuspended ? "secondary" : "danger"}
        isLoading={isPending}
        onClick={() => run(() => toggleUserSuspension(userId, !isSuspended))}
      >
        {isSuspended ? "Reativar" : "Suspender"}
      </Button>
      <ActionError error={error} />
    </div>
  );
}
