import Link from "next/link";
import { SITE } from "@/data/content";

// FILE: src/components/HomeFooter.tsx
// VERSION: 2.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Editorial-футер главной в духе malvah.co/projects — ТЁМНЫЙ (near-black) фон,
//   тёплый off-white текст #e6e6e6, нейтральный гротеск Helvetica Neue БЕЗ капса и разрядки,
//   много воздуха, спокойные колонки и крупный сдержанный вордмарк внизу. Эффект «спуска»
//   даёт мягкий контраст: тёмный контент уезжает вверх и открывает этот тёмный футер.
// SCOPE: Только reveal-футер главной. Внутренние страницы — FooterCompact.
// OUTPUT: JSX <footer> (dark editorial).
// KEYWORDS: DOMAIN(7): EditorialFooter; CONCEPT(8): MalvahStyle; TECH(6): Next/Link, Tailwind
// END_MODULE_CONTRACT
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v2.0.0 - Переверстан по замерам malvah.co/projects: bg near-black #06080d,
//   text #e6e6e6, Helvetica Neue, убраны капс/трекинг/mono, вордмарк weight-500 (не black)]
// PREV_CHANGE_SUMMARY: [v1.1.0 - Светлый #c9ced6 editorial-футер (ошибочно: malvah тёмный)]
// END_CHANGE_SUMMARY

// Нейтральный гротеск как на malvah/reframed (Helvetica Neue), а не Space Grotesk.
const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

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

// Спокойная типографика: off-white на near-black, без капса и разрядки.
const LINK =
  "text-[#e6e6e6]/50 hover:text-[#e6e6e6] transition-colors duration-300 text-[15px] leading-relaxed";
const CAP = "text-[13px] text-[#e6e6e6]/35 mb-5";

export default function HomeFooter() {
  return (
    <footer
      className="bg-[#06080d] text-[#e6e6e6] selection:bg-[#e6e6e6] selection:text-[#06080d]"
      style={{ fontFamily: HELV }}
    >
      <div className="max-w-[1700px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-6">
        {/* Верхняя мета-строка — тихая, без mono/капса/трекинга */}
        <div className="flex items-start justify-between text-[13px] text-[#e6e6e6]/40 mb-14 md:mb-24">
          <span>AI&nbsp;Legal — {SITE.domain}</span>
          <span>© 2026</span>
        </div>

        {/* Колонки */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12 mb-16 md:mb-24">
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
              <li className="text-[#e6e6e6]/50 text-[15px] leading-relaxed max-w-[230px]">
                {SITE.address}
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className={CAP}>Начать</p>
            <p className="text-[17px] leading-snug text-[#e6e6e6] mb-1">
              Готовы освоить AI?
            </p>
            <Link
              href="/#tariffs"
              className="inline-block text-[17px] leading-snug text-[#e6e6e6] underline underline-offset-4 decoration-[#e6e6e6]/30 hover:decoration-[#e6e6e6] transition-all"
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

        {/* Крупный вордмарк — как «Malvah.Studio», но сдержанный: Helvetica weight-500,
            off-white на near-black (не «кричащий» black-uppercase). */}
        <div className="border-t border-[#e6e6e6]/10 pt-8 md:pt-10 overflow-hidden">
          <div
            className="text-[#e6e6e6] text-[13.5vw] leading-[0.82] tracking-[-0.045em] whitespace-nowrap select-none"
            style={{ fontFamily: HELV, fontWeight: 500 }}
          >
            AI&nbsp;Legal
          </div>
        </div>

        {/* Реквизиты + копирайт */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[12px] text-[#e6e6e6]/35">
          <span>
            {SITE.operator} · ИНН {SITE.inn} · КПП {SITE.kpp} · ОГРН {SITE.ogrn}
          </span>
          <span>© {SITE.copyright}. Все права защищены.</span>
        </div>
      </div>
    </footer>
  );
}
