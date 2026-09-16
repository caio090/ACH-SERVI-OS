"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProfessionalVerified } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function VerifyButton({ professionalId, isVerified }: { professionalId: string; isVerified: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="secondary"
      isLoading={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleProfessionalVerified(professionalId, !isVerified);
          router.refresh();
        })
      }
    >
      {isVerified ? "Remover verificação" : "Verificar"}
    </Button>
  );
}
