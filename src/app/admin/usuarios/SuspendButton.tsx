"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserSuspension } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function SuspendButton({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant={isSuspended ? "secondary" : "danger"}
      isLoading={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleUserSuspension(userId, !isSuspended);
          router.refresh();
        })
      }
    >
      {isSuspended ? "Reativar" : "Suspender"}
    </Button>
  );
}
