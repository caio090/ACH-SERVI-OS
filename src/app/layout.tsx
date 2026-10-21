import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
// Favicon e ícone Apple: src/app/icon.png e src/app/apple-icon.png (convenção de
// arquivos do App Router; origem em docs/brand-assets.md).
export const metadata: Metadata = {
  title: { default: "Achô Serviço", template: "%s · Achô Serviço" },
  description: "Encontre profissionais para resolver o que você precisa.",
  applicationName: "Achô Serviço",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-[100dvh] flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-5 sm:px-6 md:pb-12 md:pt-6">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
