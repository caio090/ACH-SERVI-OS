import Link from "next/link";
import { LEGAL_REVIEW_NOTICE, LEGAL_VERSION, type LegalDocument } from "@/lib/legal";

export function LegalPage({ document, other }: { document: LegalDocument; other: { href: string; label: string } }) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-neutral-900">{document.title}</h1>
        <p className="w-fit rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{LEGAL_REVIEW_NOTICE}</p>
        <p className="text-xs text-neutral-500">
          Atualizado em {document.updatedAt} · versão {LEGAL_VERSION}
        </p>
      </header>

      <nav aria-label="Seções" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {document.sections.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="text-brand-600 hover:underline">
            {section.title}
          </a>
        ))}
      </nav>

      {document.sections.map((section) => (
        <section key={section.id} id={section.id} className="flex scroll-mt-20 flex-col gap-2">
          <h2 className="text-base font-bold text-neutral-900">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-neutral-700">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <Link href={other.href} className="text-sm font-semibold text-brand-600 hover:underline">
        {other.label} →
      </Link>
    </article>
  );
}
