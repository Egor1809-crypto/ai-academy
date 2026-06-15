import Link from "next/link";
import { SITE } from "@/data/content";

export default function Footer() {
  return (
    <footer className="bg-black relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent blur-sm" />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-12 gap-12 mb-10 md:mb-16">
          {/* Left — brand + description */}
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-lg transition-shadow duration-300 group-hover:shadow-[0_0_20px_rgba(0,207,255,0.4)]">
                L
              </div>
              <span className="font-heading font-bold text-xl tracking-wider text-white">
                AI<span className="text-gold">LEGAL</span>
              </span>
            </Link>
            <p className="text-gray-500 leading-relaxed text-sm max-w-sm mb-8">
              Образовательная платформа для юристов нового поколения.
              Интеграция AI в юридическую практику.
            </p>

            {/* Socials */}
            <div className="flex gap-3">
              <a
                href={SITE.socials.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 hover:border-gold/40 hover:text-gold hover:shadow-[0_0_15px_rgba(0,207,255,0.15)] transition-all duration-300"
                aria-label="Telegram"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <a
                href={SITE.socials.vk}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 hover:border-gold/40 hover:text-gold hover:shadow-[0_0_15px_rgba(0,207,255,0.15)] transition-all duration-300"
                aria-label="VK"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.491 2.27 4.674 2.862 4.674.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.624 2.18-3.624.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Center — nav */}
          <div className="md:col-span-3">
            <h4 className="text-white font-heading font-bold text-xs uppercase tracking-[0.2em] mb-6">
              Навигация
            </h4>
            <ul className="space-y-3.5">
              {[
                { label: "О курсе", href: "/about" },
                { label: "Программа", href: "/program" },
                { label: "Эксперты", href: "/experts" },
                { label: "Тарифы", href: "/tariffs" },
                { label: "Продукты", href: "/products" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 text-sm hover:text-gold transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 h-px bg-gold group-hover:w-3 transition-all duration-300" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — contacts + legal */}
          <div className="md:col-span-4">
            <h4 className="text-white font-heading font-bold text-xs uppercase tracking-[0.2em] mb-6">
              Контакты
            </h4>
            <ul className="space-y-3.5 mb-8">
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="text-gray-500 text-sm hover:text-gold transition-colors duration-300 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gold/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\D/g, "")}`}
                  className="text-gray-500 text-sm hover:text-gold transition-colors duration-300 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gold/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {SITE.phone}
                </a>
              </li>
              <li className="text-gray-500 text-sm flex items-center gap-3">
                <svg className="w-4 h-4 text-gold/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {SITE.address}
              </li>
            </ul>

            {/* Legal links */}
            <div className="space-y-2">
              {[
                { label: "Договор оферты", href: "/legal/offer" },
                { label: "Политика конфиденциальности", href: "/legal/privacy" },
                { label: "Согласие на обработку ПДн", href: "/legal/consent" },
                { label: "Политика cookie", href: "/legal/cookies" },
                { label: "Пользовательское соглашение", href: "/legal/terms" },
                { label: "Лицензия", href: "/legal/license" },
              ].map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="block text-gray-600 text-xs hover:text-gold/70 transition-colors duration-300"
                >
                  {doc.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs text-gray-600">
              &copy; {SITE.copyright}. Все права защищены.
            </span>
            <span className="text-[10px] text-gray-700 font-mono">
              {SITE.operator} &middot; ИНН {SITE.inn} &middot; КПП {SITE.kpp} &middot; ОГРН {SITE.ogrn}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
