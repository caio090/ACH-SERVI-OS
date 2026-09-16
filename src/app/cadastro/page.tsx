import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Criar conta</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Leva menos de um minuto. Você pode pedir serviços e, depois, também virar profissional.
        </p>
      </div>

      <SignUpForm />

      <p className="text-center text-sm text-neutral-600">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
