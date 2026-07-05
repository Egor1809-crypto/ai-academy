import { SITE } from "@/data/content";

/**
 * Единая обёртка для юридических страниц (политика, оферта, согласия, cookies,
 * пользовательское соглашение). Заголовок, контейнер документа и подвал с
 * реквизитами оператора и датой редакции.
 */
export default function LegalDoc({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute top-1/3 left-1/2 w-[600px] h-[400px] bg-cyber-blue/5 rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-6">
            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Юридический документ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
          {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
        </div>

        <div className="bg-white/[0.02] border border-white/10 p-5 md:p-12">
          <div className="space-y-6 text-gray-300 leading-relaxed text-sm legal-body">
            {children}
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-xs text-gray-600 font-mono leading-relaxed">
            Оператор: {SITE.operator} · ИНН {SITE.inn} · КПП {SITE.kpp} · ОГРН {SITE.ogrn}
            <br />
            Адрес: {SITE.address} · {SITE.email} · {SITE.phone}
            <br />
            Версия {SITE.legalVersion} от {SITE.legalRevision} · настоящая редакция
            действует с {SITE.legalRevision}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Заголовок раздела внутри документа. */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-bold text-lg mb-3 mt-2">{children}</h2>;
}
