import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { getPrivacyPolicy } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidade — ACHÔ SERVIÇO" };

export default function PrivacyPage() {
  return <LegalPage document={getPrivacyPolicy()} other={{ href: "/termos", label: "Termos de Uso" }} />;
}
