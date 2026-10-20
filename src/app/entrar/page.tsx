import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Entrar</h1>
        <p className="mt-1 text-sm text-neutral-600">Acesse sua conta para pedir ou oferecer serviços.</p>
      </div>

      <Suspense>
        <LoginForm redirectTo={searchParams.redirect || "/"} />
      </Suspense>

      <p className="text-center text-sm text-neutral-600">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-600 hover:underline">
          Cadastre-se
        </Link>
      </p>

      <p className="text-center text-xs text-neutral-500">
        Ao entrar, você continua sujeito aos{" "}
        <Link href="/termos" className="underline hover:text-neutral-800">
          Termos de Uso
        </Link>{" "}
        e à{" "}
        <Link href="/privacidade" className="underline hover:text-neutral-800">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
