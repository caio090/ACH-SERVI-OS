"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createServiceRequest, type CreateRequestState } from "@/lib/actions/requests";
import { InputField, SelectField, TextareaField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { CategoryRow } from "@/lib/database.types";

const initialState: CreateRequestState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" isLoading={pending}>
      Enviar pedido
    </Button>
  );
}

export function NewRequestForm({ categories }: { categories: CategoryRow[] }) {
  const [state, formAction] = useFormState(createServiceRequest, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.requestId) {
      router.push(`/pedidos/${state.requestId}`);
    }
  }, [state.requestId, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <SelectField id="category_id" name="category_id" label="Categoria" required defaultValue="">
        <option value="" disabled>
          Selecione uma categoria
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.icon} {category.name}
          </option>
        ))}
      </SelectField>

      <TextareaField
        id="description"
        name="description"
        label="Descreva o problema"
        required
        placeholder="Ex.: tomada da cozinha parou de funcionar"
      />

      <div className="grid grid-cols-2 gap-3">
        <InputField id="neighborhood" name="neighborhood" label="Bairro" required />
        <InputField id="city" name="city" label="Cidade" required />
      </div>

      <InputField id="desired_date" name="desired_date" type="date" label="Data desejada" required min={today} />

      <div className="grid grid-cols-2 gap-3">
        <InputField id="time_window_start" name="time_window_start" type="time" label="A partir de" required />
        <InputField id="time_window_end" name="time_window_end" type="time" label="Até" required />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="is_urgent" className="h-4 w-4 rounded border-neutral-300 text-brand-600" />
        É urgente
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="photos" className="text-sm font-medium text-neutral-800">
          Fotos (opcional)
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-neutral-500">Até 5 fotos, JPEG/PNG/WEBP, 8MB cada.</p>
      </div>

      <SubmitButton />
    </form>
  );
}
