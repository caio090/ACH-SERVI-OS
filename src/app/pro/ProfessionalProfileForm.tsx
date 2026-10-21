"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { upsertProfessionalProfile, type ProfessionalProfileState } from "@/lib/actions/professional";
import { InputField, TextareaField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { CategoryRow } from "@/lib/database.types";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

const initialState: ProfessionalProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth isLoading={pending}>
      Salvar
    </Button>
  );
}

export function ProfessionalProfileForm({
  categories,
  redirectTo,
  defaultBio = "",
  defaultServiceAreas = "",
  defaultRadius,
  defaultCategoryIds = [],
}: {
  categories: CategoryRow[];
  redirectTo?: string;
  defaultBio?: string;
  defaultServiceAreas?: string;
  defaultRadius?: number | null;
  defaultCategoryIds?: string[];
}) {
  const [state, formAction] = useFormState(upsertProfessionalProfile, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && redirectTo) {
      router.push(redirectTo);
    }
  }, [state.success, redirectTo, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !redirectTo && <Alert tone="success">Perfil salvo com sucesso.</Alert>}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-800">Categorias</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="checkbox"
                name="category_ids"
                value={category.id}
                defaultChecked={defaultCategoryIds.includes(category.id)}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600"
              />
              <CategoryIcon category={category} className="h-4 w-4 text-action-700" />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <InputField
        id="service_areas"
        name="service_areas"
        label="Bairros/regiões atendidos"
        placeholder="Ex.: Centro, Vila Nova, Jardim América"
        defaultValue={defaultServiceAreas}
        hint="Separe por vírgula."
        required
      />

      <InputField
        id="service_radius_km"
        name="service_radius_km"
        type="number"
        min={0}
        step="0.5"
        label="Raio de atendimento (km, opcional)"
        defaultValue={defaultRadius ?? undefined}
      />

      <TextareaField
        id="bio"
        name="bio"
        label="Sobre você"
        placeholder="Conte sua experiência e diferenciais"
        defaultValue={defaultBio}
      />

      <SubmitButton />
    </form>
  );
}
