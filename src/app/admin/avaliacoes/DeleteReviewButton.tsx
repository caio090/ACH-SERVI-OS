"use client";

import { deleteReview } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const { run, isPending, error } = useActionRunner();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:bg-red-50"
        isLoading={isPending}
        onClick={() => {
          if (!confirm("Remover esta avaliação?")) return;
          run(() => deleteReview(reviewId));
        }}
      >
        Remover
      </Button>
      <ActionError error={error} />
    </div>
  );
}
