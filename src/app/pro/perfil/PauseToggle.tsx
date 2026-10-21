"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePauseNewRequests } from "@/lib/actions/professional";

export function PauseToggle({ isActive }: { isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await togglePauseNewRequests(!isActive);
          router.refresh();
        })
      }
      className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
        isActive ? "bg-brand-500" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
          isActive ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
