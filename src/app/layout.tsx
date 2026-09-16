import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description:
    "Marketplace local que conecta clientes e profissionais de serviços. Precisou? Achô.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f9490c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 md:pb-10">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
