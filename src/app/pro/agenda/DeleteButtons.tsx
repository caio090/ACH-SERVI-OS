"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAvailabilityException, deleteAvailabilityRule } from "@/lib/actions/professional";

export function DeleteRuleButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await deleteAvailabilityRule(id);
        router.refresh();
      })}
      className="text-sm text-neutral-400 hover:text-red-600"
      aria-label="Remover horário"
    >
      ✕
    </button>
  );
}

export function DeleteExceptionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await deleteAvailabilityException(id);
        router.refresh();
      })}
      className="text-sm text-neutral-400 hover:text-red-600"
      aria-label="Remover exceção"
    >
      ✕
    </button>
  );
}
