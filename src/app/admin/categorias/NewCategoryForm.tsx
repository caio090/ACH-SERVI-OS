"use client";

import { useRef } from "react";
import { createCategory } from "@/lib/actions/admin";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function NewCategoryForm() {
  const { run, isPending, error } = useActionRunner();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 p-3 sm:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        run(() => createCategory(formData), () => formRef.current?.reset());
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
      <div className="sm:col-span-4">
        <ActionError error={error} />
      </div>
    </form>
  );
}
