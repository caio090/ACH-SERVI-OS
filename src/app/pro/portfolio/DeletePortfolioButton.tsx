"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePortfolioItem } from "@/lib/actions/professional";

export function DeletePortfolioButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await deletePortfolioItem(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
        aria-label="Remover foto"
      >
        ✕
      </button>
      {error && (
        <p role="alert" className="px-2 pt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
