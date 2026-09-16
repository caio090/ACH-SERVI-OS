"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelServiceRequest } from "@/lib/actions/requests";
import { Button } from "@/components/ui/Button";

export function CancelButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit text-red-600 hover:bg-red-50"
      isLoading={isPending}
      onClick={() => {
        if (!confirm("Cancelar este pedido?")) return;
        startTransition(async () => {
          await cancelServiceRequest(requestId);
          router.refresh();
        });
      }}
    >
      Cancelar pedido
    </Button>
  );
}
