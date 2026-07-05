"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import RegistrationModal from "./RegistrationModal";

// FILE: src/components/Navbar.tsx — VERSION 2.0.0
// Editorial-редизайн: убран капс-меню → normal-case, циан-акцент, pill-CTA. Логика
// (скролл-фон, мобильное меню, модалка заявки) сохранена. Дефолт-тариф — «Практик».

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const navLinks = [
  { href: "/about", label: "О курсе" },
  { href: "/products", label: "Продукты" },
  { href: "/program", label: "Программа" },
  { href: "/experts", label: "Эксперты" },
  { href: "/tariffs", label: "Тарифы" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-navy-900/90 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{ fontFamily: HELV }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-cyber-blue flex items-center justify-center font-bold text-navy-900 text-xl transition-shadow duration-300 group-hover:shadow-[0_0_15px_rgba(0,207,255,0.5)]" style={{ fontFamily: HELV }}>
              L
            </div>
            <span className="font-bold text-xl tracking-tight text-white" style={{ fontFamily: HELV }}>
              AI<span className="text-cyber-blue">LEGAL</span>
            </span>
          </a>

          <div className="hidden xl:flex items-center gap-9 text-[15px] text-[#e6e6e6]/70">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative transition-colors duration-300 after:absolute after:bottom-[-5px] after:left-0 after:h-[1.5px] after:bg-cyber-blue after:transition-all after:duration-300 ${
                  pathname === l.href ? "text-cyber-blue after:w-full" : "hover:text-white after:w-0 hover:after:w-full"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/cabinet"
              className="hidden xl:block text-[15px] text-[#e6e6e6]/70 hover:text-white transition-colors"
            >
              Кабинет
            </Link>
            <button
              onClick={() => setShowRegistration(true)}
              className="hidden xl:inline-flex items-center gap-2 rounded-full px-6 py-2.5 bg-cyber-blue text-navy-900 font-semibold text-[14px] transition-all duration-300 hover:shadow-[0_0_30px_-6px_rgba(0,207,255,0.7)] hover:-translate-y-0.5 cursor-pointer"
            >
              Оставить заявку
            </button>

            <button
              className="xl:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Меню"
            >
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        <div className={`xl:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-96 border-t border-white/10" : "max-h-0"}`}>
          <div className="bg-navy-900/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[17px] py-1 transition-colors ${pathname === l.href ? "text-cyber-blue" : "text-[#e6e6e6]/70 hover:text-white"}`}
                style={{ fontFamily: HELV }}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/cabinet" className="text-[17px] py-1 text-[#e6e6e6]/70 hover:text-white transition-colors" style={{ fontFamily: HELV }}>
              Личный кабинет
            </Link>
            <button
              onClick={() => { setShowRegistration(true); setMobileOpen(false); }}
              className="mt-2 py-3.5 rounded-full bg-cyber-blue text-navy-900 font-semibold text-center cursor-pointer"
              style={{ fontFamily: HELV }}
            >
              Оставить заявку
            </button>
          </div>
        </div>
      </nav>

      {showRegistration && (
        <RegistrationModal tariff="Практик" onClose={() => setShowRegistration(false)} />
      )}
    </>
  );
}
