import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants";

export async function Header() {
  const profile = await getCurrentUser();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-tight text-brand-600">{BRAND_NAME}</span>
          <span className="text-[11px] text-neutral-500">{BRAND_TAGLINE}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-neutral-700 md:flex">
          <Link href="/buscar" className="hover:text-brand-600">
            Buscar
          </Link>
          <Link href="/pedidos" className="hover:text-brand-600">
            Meus pedidos
          </Link>
          <Link href="/pro/painel" className="hover:text-brand-600">
            Área profissional
          </Link>
          {profile?.role === "admin" && (
            <Link href="/admin" className="hover:text-brand-600">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <form action={signOut}>
              <button type="submit" className="text-sm font-medium text-neutral-600 hover:text-brand-600">
                Sair
              </button>
            </form>
          ) : (
            <Link
              href="/entrar"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
