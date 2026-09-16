"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteReview } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      isLoading={isPending}
      onClick={() => {
        if (!confirm("Remover esta avaliação?")) return;
        startTransition(async () => {
          await deleteReview(reviewId);
          router.refresh();
        });
      }}
    >
      Remover
    </Button>
  );
}
