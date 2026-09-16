"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePortfolioItem } from "@/lib/actions/professional";

export function DeletePortfolioButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deletePortfolioItem(id);
          router.refresh();
        })
      }
      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
      aria-label="Remover foto"
    >
      ✕
    </button>
  );
}
