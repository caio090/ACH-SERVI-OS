"use client";

import { toggleProfessionalVerified } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function VerifyButton({ professionalId, isVerified }: { professionalId: string; isVerified: boolean }) {
  const { run, isPending, error } = useActionRunner();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        isLoading={isPending}
        onClick={() => run(() => toggleProfessionalVerified(professionalId, !isVerified))}
      >
        {isVerified ? "Remover verificação" : "Verificar"}
      </Button>
      <ActionError error={error} />
    </div>
  );
}
