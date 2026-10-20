import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/profissionais", label: "Profissionais" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/avaliacoes", label: "Avaliações" },
  { href: "/admin/denuncias", label: "Denúncias" },
  { href: "/admin/auditoria", label: "Auditoria" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/entrar?redirect=/admin");
  }

  if (profile!.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:flex-row">
      <nav className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
