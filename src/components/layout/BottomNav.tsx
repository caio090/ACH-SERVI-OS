"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/buscar", label: "Buscar", icon: "🔎" },
  { href: "/pedidos", label: "Pedidos", icon: "📋" },
  { href: "/pro/painel", label: "Sou profissional", icon: "🧰" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white md:hidden"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                  isActive ? "text-brand-600" : "text-neutral-500"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
