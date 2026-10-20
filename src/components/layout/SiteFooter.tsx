import Link from "next/link";
import { BRAND_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-4 pb-28 pt-5 text-xs text-neutral-500 md:pb-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 sm:px-2">
        <span>
          {BRAND_NAME} · beta controlado
        </span>
        <nav aria-label="Documentos legais" className="flex gap-4">
          <Link href="/termos" className="hover:text-neutral-800 hover:underline">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-neutral-800 hover:underline">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
