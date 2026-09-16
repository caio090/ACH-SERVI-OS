"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/actions/chat";
import { Button } from "@/components/ui/Button";

export function MessageForm({ conversationId, requestId }: { conversationId: string; requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const body = String(formData.get("body") || "");
        if (!body.trim()) return;
        startTransition(async () => {
          await sendMessage({ conversationId, requestId, body });
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <input
        name="body"
        placeholder="Escreva uma mensagem"
        autoComplete="off"
        className="flex-1 rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <Button type="submit" isLoading={isPending}>
        Enviar
      </Button>
    </form>
  );
}
