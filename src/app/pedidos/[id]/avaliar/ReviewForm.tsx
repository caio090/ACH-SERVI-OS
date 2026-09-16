"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReview } from "@/lib/actions/requests";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ReviewForm({
  appointmentId,
  professionalId,
  requestId,
}: {
  appointmentId: string;
  professionalId: string;
  requestId: string;
}) {
  const [rating, setRating] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await createReview({
              appointmentId,
              professionalId,
              rating,
              comment: String(formData.get("comment") || ""),
            });
            router.push(`/pedidos/${requestId}`);
          } catch {
            setError("Não foi possível enviar sua avaliação. Tente novamente.");
          }
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-800">Nota</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              onClick={() => setRating(value)}
              className="text-3xl leading-none"
            >
              {value <= rating ? "⭐" : "☆"}
            </button>
          ))}
        </div>
      </div>

      <TextareaField id="comment" name="comment" label="Comentário (opcional)" placeholder="Conte como foi o atendimento" />

      <Button type="submit" isLoading={isPending}>
        Enviar avaliação
      </Button>
    </form>
  );
}
