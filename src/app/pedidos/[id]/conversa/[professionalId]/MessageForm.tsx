"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/actions/chat";
import { Button } from "@/components/ui/Button";

export function MessageForm({ conversationId, requestId }: { conversationId: string; requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const body = String(formData.get("body") || "");
        if (!body.trim()) return;
        setError(null);
        startTransition(async () => {
          const result = await sendMessage({ conversationId, requestId, body });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <input
          name="body"
          placeholder="Escreva uma mensagem"
          autoComplete="off"
          maxLength={2000}
          className="flex-1 rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <Button type="submit" isLoading={isPending}>
          Enviar
        </Button>
      </div>
    </form>
  );
}
