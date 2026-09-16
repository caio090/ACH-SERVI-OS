"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAvailabilityException } from "@/lib/actions/professional";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AddAvailabilityExceptionForm() {
  const [isPending, startTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          await addAvailabilityException(formData);
          formRef.current?.reset();
          setIsAvailable(false);
          router.refresh();
        });
      }}
    >
      <InputField id="exception_date" name="exception_date" type="date" label="Data" required />
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="is_available"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-600"
        />
        É uma abertura extra (fora do horário padrão)
      </label>
      {isAvailable && (
        <div className="grid grid-cols-2 gap-3">
          <InputField id="start_time" name="start_time" type="time" label="Início" />
          <InputField id="end_time" name="end_time" type="time" label="Fim" />
        </div>
      )}
      <InputField id="reason" name="reason" label="Motivo (opcional)" placeholder="Ex.: folga, viagem" />
      <Button type="submit" size="sm" isLoading={isPending} className="w-fit">
        Adicionar exceção
      </Button>
    </form>
  );
}
