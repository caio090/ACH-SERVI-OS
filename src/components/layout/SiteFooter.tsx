import Link from "next/link";

/**
 * Rodapé só com links funcionais. A marca fica no cabeçalho; no celular a
 * navegação principal é a barra inferior (BottomNav).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-4 pb-28 pt-4 text-xs text-neutral-500 md:pb-5">
      <nav aria-label="Documentos legais" className="mx-auto flex w-full max-w-6xl justify-center gap-5 sm:justify-end sm:px-2">
        <Link href="/termos" className="py-1 hover:text-neutral-800 hover:underline">
          Termos de Uso
        </Link>
        <Link href="/privacidade" className="py-1 hover:text-neutral-800 hover:underline">
          Privacidade
        </Link>
      </nav>
    </footer>
  );
}
