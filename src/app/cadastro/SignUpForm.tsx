"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth isLoading={pending}>
      Criar conta
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useFormState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <InputField id="full_name" name="full_name" label="Nome completo" required autoComplete="name" />
      <InputField id="email" name="email" type="email" label="E-mail" required autoComplete="email" />
      <InputField
        id="password"
        name="password"
        type="password"
        label="Senha"
        required
        minLength={6}
        autoComplete="new-password"
        hint="Mínimo de 6 caracteres."
      />
      <SubmitButton />
    </form>
  );
}
