import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { getTermsOfUse } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de Uso — ACHÔ SERVIÇO" };

export default function TermsPage() {
  return <LegalPage document={getTermsOfUse()} other={{ href: "/privacidade", label: "Política de Privacidade" }} />;
}
