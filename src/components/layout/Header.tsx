import Image from "next/image";
import Link from "next/link";
import headerLogo from "../../../public/brand/logo-acho-servico-header.png";
import { getCurrentUser } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/constants";
import {
  assertSupabaseConfigOutsideVisualPreview,
  hasPublicSupabaseConfig,
} from "@/lib/supabase/config";
import { Icon } from "@/components/ui/Icon";

export async function Header() {
  if (!hasPublicSupabaseConfig()) {
    assertSupabaseConfigOutsideVisualPreview();
  }

  const profile = hasPublicSupabaseConfig() ? await getCurrentUser() : null;
  const location = profile?.neighborhood || profile?.city || "Definir localização";
  const profileHref = profile
    ? profile.role === "professional"
      ? "/pro/painel"
      : "/pedidos"
    : "/entrar";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${BRAND_NAME} — Início`}
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2"
        >
          <Image
            src={headerLogo}
            alt={BRAND_NAME}
            priority
            sizes="(min-width: 768px) 132px, 108px"
            className="h-9 w-auto object-contain md:h-11"
          />
        </Link>

        <Link
          href="/pedir"
          className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-2 text-neutral-600 hover:bg-neutral-100 sm:max-w-[13rem] md:order-3 md:ml-auto md:flex-none"
          aria-label={`Localização: ${location}`}
        >
          <Icon name="map-pin" className="h-4 w-4 shrink-0 text-action-700" />
          <span className="truncate text-[11px] font-medium sm:text-xs">{location}</span>
        </Link>

        <nav className="order-2 ml-6 hidden items-center gap-1 text-sm font-semibold text-neutral-600 md:flex">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-neutral-100 hover:text-neutral-950">
            Início
          </Link>
          <Link href="/buscar" className="rounded-lg px-3 py-2 hover:bg-neutral-100 hover:text-neutral-950">
            Buscar
          </Link>
          <Link
            href="/pedir"
            className="rounded-lg px-3 py-2 text-action-700 hover:bg-action-50"
          >
            Pedir serviço
          </Link>
          <Link href="/pedidos" className="rounded-lg px-3 py-2 hover:bg-neutral-100 hover:text-neutral-950">
            Pedidos
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:order-4 md:ml-1">
          <button
            type="button"
            aria-label="Notificações"
            className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500"
          >
            <Icon name="bell" className="h-5 w-5" />
          </button>
          <Link
            href={profileHref}
            aria-label={profile ? `Perfil de ${profile.full_name}` : "Entrar ou acessar perfil"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2"
          >
            {profile?.full_name ? (
              <span className="text-sm font-bold">{profile.full_name.charAt(0).toUpperCase()}</span>
            ) : (
              <Icon name="user" className="h-5 w-5" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
