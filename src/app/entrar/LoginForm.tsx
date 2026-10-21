"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth isLoading={pending}>
      Entrar
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <InputField id="email" name="email" type="email" label="E-mail" required autoComplete="email" />
      <InputField
        id="password"
        name="password"
        type="password"
        label="Senha"
        required
        autoComplete="current-password"
      />
      <SubmitButton />
    </form>
  );
}
