"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAvailabilityRule } from "@/lib/actions/professional";
import { SelectField, InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { WEEKDAY_LABELS } from "@/lib/constants";

export function AddAvailabilityRuleForm() {
  const [isPending, startTransition] = useTransition();
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
          await addAvailabilityRule(formData);
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <SelectField id="weekday" name="weekday" label="Dia da semana" defaultValue="1" required>
        {WEEKDAY_LABELS.map((label, index) => (
          <option key={label} value={index}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <InputField id="start_time" name="start_time" type="time" label="Início" required />
        <InputField id="end_time" name="end_time" type="time" label="Fim" required />
      </div>
      <Button type="submit" size="sm" isLoading={isPending} className="w-fit">
        Adicionar horário
      </Button>
    </form>
  );
}
