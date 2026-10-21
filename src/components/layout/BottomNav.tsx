"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

const items: Array<{ href: string; label: string; icon: IconName; primary?: boolean }> = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/buscar", label: "Buscar", icon: "search" },
  { href: "/pedir", label: "Pedir", icon: "plus", primary: true },
  { href: "/pedidos", label: "Pedidos", icon: "clipboard" },
  { href: "/entrar", label: "Perfil", icon: "user" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 px-1">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                className={`flex h-full min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 ${
                  item.primary
                    ? "text-action-700"
                    : isActive
                      ? "text-neutral-950"
                      : "text-neutral-500"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`flex items-center justify-center ${
                    item.primary
                      ? "-mt-5 h-12 w-12 rounded-2xl border-4 border-white bg-action-600 text-white shadow-md"
                      : "h-6 w-8"
                  }`}
                >
                  <Icon name={item.icon} className={item.primary ? "h-6 w-6" : "h-5 w-5"} />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
