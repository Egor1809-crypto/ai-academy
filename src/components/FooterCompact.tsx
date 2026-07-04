import Link from "next/link";
import { SITE } from "@/data/content";

// FILE: src/components/FooterCompact.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Облегчённый футер для внутренних страниц. Полный футер с reveal-эффектом —
//   только на главной; здесь — без brand/nav/соцсетей, чтобы не дублировать его.
// SCOPE: Юридически обязательный минимум, доступный с любой страницы (152-ФЗ/ЗоЗПП):
//   реквизиты оператора, ссылки на все юр-документы, контакт.
// OUTPUT: JSX <footer>.
// KEYWORDS: DOMAIN(7): LegalFooter; CONCEPT(6): Compliance; TECH(6): Next/Link
// END_MODULE_CONTRACT

const LEGAL_LINKS = [
  { label: "Оферта", href: "/legal/offer" },
  { label: "Конфиденциальность", href: "/legal/privacy" },
  { label: "Согласие на ПДн", href: "/legal/consent" },
  { label: "Cookie", href: "/legal/cookies" },
  { label: "Соглашение", href: "/legal/terms" },
  { label: "Лицензия", href: "/legal/license" },
];

export default function FooterCompact() {
  return (
    <footer className="bg-black relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Юр-ссылки + контакты */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="text-gray-500 text-xs hover:text-gold transition-colors duration-300"
              >
                {d.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            <a href={`mailto:${SITE.email}`} className="hover:text-gold transition-colors duration-300">
              {SITE.email}
            </a>
            <a
              href={`tel:${SITE.phone.replace(/\D/g, "")}`}
              className="hover:text-gold transition-colors duration-300"
            >
              {SITE.phone}
            </a>
          </div>
        </div>

        {/* Реквизиты оператора + копирайт */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="text-[10px] text-gray-700 font-mono leading-relaxed">
            {SITE.operator} &middot; ИНН {SITE.inn} &middot; КПП {SITE.kpp} &middot; ОГРН {SITE.ogrn}
            <br className="md:hidden" /> <span className="hidden md:inline">&middot; </span>{SITE.address}
          </span>
          <span className="text-[11px] text-gray-600 shrink-0">
            &copy; {SITE.copyright}. Все права защищены.
          </span>
        </div>
      </div>
    </footer>
  );
}
