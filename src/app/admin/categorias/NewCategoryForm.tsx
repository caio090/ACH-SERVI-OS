"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/actions/admin";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewCategoryForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 p-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          await createCategory(formData);
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <InputField id="name" name="name" label="Nome" required />
      <InputField id="slug" name="slug" label="Slug" required placeholder="ex-servico" />
      <InputField id="icon" name="icon" label="Ícone (emoji)" defaultValue="🛠️" />
      <div className="flex items-end">
        <Button type="submit" size="sm" isLoading={isPending} fullWidth>
          Adicionar categoria
        </Button>
      </div>
    </form>
  );
}
