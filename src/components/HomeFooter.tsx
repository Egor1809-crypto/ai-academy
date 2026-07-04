import Link from "next/link";
import { SITE } from "@/data/content";

// FILE: src/components/HomeFooter.tsx
// VERSION: 1.1.0
// START_MODULE_CONTRACT:
// PURPOSE: Editorial-футер главной в духе malvah.co — СВЕТЛЫЙ фон, много воздуха,
//   колонки-ссылки и ГИГАНТСКИЙ вордмарк внизу. Эффект «спуска» даёт контраст: тёмный
//   контент уезжает вверх и открывает этот светлый футер (без подсветок-костылей).
// SCOPE: Только reveal-футер главной. Внутренние страницы — FooterCompact (тёмный, минимал).
// OUTPUT: JSX <footer> (light editorial).
// KEYWORDS: DOMAIN(7): EditorialFooter; CONCEPT(8): MalvahStyle; TECH(6): Next/Link, Tailwind
// END_MODULE_CONTRACT

const NAV = [
  { label: "О курсе", href: "/about" },
  { label: "Программа", href: "/program" },
  { label: "Эксперты", href: "/experts" },
  { label: "Тарифы", href: "/tariffs" },
  { label: "Продукты", href: "/products" },
];

const LEGAL = [
  { label: "Договор оферты", href: "/legal/offer" },
  { label: "Политика конфиденциальности", href: "/legal/privacy" },
  { label: "Согласие на обработку ПДн", href: "/legal/consent" },
  { label: "Политика cookie", href: "/legal/cookies" },
  { label: "Пользовательское соглашение", href: "/legal/terms" },
  { label: "Лицензия", href: "/legal/license" },
];

const LINK =
  "text-[#0a1628]/55 hover:text-[#0a1628] transition-colors duration-300 text-[15px] leading-relaxed";
const CAP =
  "text-[11px] font-mono uppercase tracking-[0.22em] text-[#0a1628]/40 mb-5";

export default function HomeFooter() {
  return (
    <footer className="bg-[#c9ced6] text-[#0a1628] selection:bg-[#0a1628] selection:text-[#c9ced6]">
      <div className="max-w-[1700px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-6">
        {/* Верхняя мета-строка */}
        <div className="flex items-start justify-between text-[11px] font-mono uppercase tracking-[0.22em] text-[#0a1628]/45 mb-14 md:mb-24">
          <span>AI&nbsp;Legal — {SITE.domain}</span>
          <span>© 2026</span>
        </div>

        {/* Колонки */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12 mb-16 md:mb-24">
          {/* Навигация */}
          <div className="lg:col-span-3">
            <p className={CAP}>Навигация</p>
            <ul className="space-y-2.5">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Документы */}
          <div className="lg:col-span-3">
            <p className={CAP}>Документы</p>
            <ul className="space-y-2.5">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Контакты */}
          <div className="lg:col-span-3">
            <p className={CAP}>Контакты</p>
            <ul className="space-y-2.5">
              <li>
                <a href={`mailto:${SITE.email}`} className={LINK}>
                  {SITE.email}
                </a>
              </li>
              <li>
                <a href={`tel:${SITE.phone.replace(/\D/g, "")}`} className={LINK}>
                  {SITE.phone}
                </a>
              </li>
              <li className="text-[#0a1628]/55 text-[15px] leading-relaxed max-w-[230px]">
                {SITE.address}
              </li>
            </ul>
          </div>

          {/* CTA + соцсети */}
          <div className="lg:col-span-3">
            <p className={CAP}>Начать</p>
            <p className="text-[17px] leading-snug text-[#0a1628] mb-1">
              Готовы освоить AI?
            </p>
            <Link
              href="/#tariffs"
              className="inline-block text-[17px] leading-snug text-[#0a1628] underline underline-offset-4 decoration-[#0a1628]/30 hover:decoration-[#0a1628] transition-all"
            >
              Оставить заявку →
            </Link>
            <div className="flex gap-5 mt-6">
              <a href={SITE.socials.telegram} target="_blank" rel="noopener noreferrer" className={LINK}>
                Telegram
              </a>
              <a href={SITE.socials.vk} target="_blank" rel="noopener noreferrer" className={LINK}>
                VK
              </a>
            </div>
          </div>
        </div>

        {/* Гигантский вордмарк — как «Malvah.Studio» */}
        <div className="border-t border-[#0a1628]/15 pt-6 md:pt-8 overflow-hidden">
          <div className="font-heading font-black tracking-[-0.03em] leading-[0.78] text-[#0a1628] text-[19vw] md:text-[15vw] whitespace-nowrap select-none">
            AI&nbsp;LEGAL
          </div>
        </div>

        {/* Реквизиты + копирайт */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px] font-mono text-[#0a1628]/45">
          <span>
            {SITE.operator} &middot; ИНН {SITE.inn} &middot; КПП {SITE.kpp} &middot; ОГРН {SITE.ogrn}
          </span>
          <span>&copy; {SITE.copyright}. Все права защищены.</span>
        </div>
      </div>
    </footer>
  );
}
