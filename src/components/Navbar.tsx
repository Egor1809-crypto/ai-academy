"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/about", label: "О курсе" },
  { href: "/program", label: "Программа" },
  { href: "/experts", label: "Эксперты" },
  { href: "/tariffs", label: "Тарифы" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy-900/90 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-xl transition-shadow duration-300 group-hover:shadow-[0_0_15px_rgba(0,207,255,0.5)]">
            L
          </div>
          <span className="font-heading font-bold text-xl tracking-wider">
            AI<span className="text-gold">LEGAL</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300 uppercase tracking-widest">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300 ${
                pathname === l.href
                  ? "text-gold after:w-full"
                  : "hover:text-gold after:w-0 hover:after:w-full"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/tariffs"
            className="hidden md:block px-6 py-2.5 bg-transparent border border-gold text-gold font-heading font-bold hover:bg-gold hover:text-navy-900 transition-all duration-300 uppercase tracking-wide text-sm glow-gold-hover"
          >
            Регистрация
          </Link>

          <button
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Меню"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-80 border-t border-white/10" : "max-h-0"
        }`}
      >
        <div className="bg-navy-900/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-heading uppercase tracking-widest text-sm py-2 transition-colors ${
                pathname === l.href ? "text-gold" : "text-gray-300 hover:text-gold"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/tariffs"
            className="mt-2 py-3 bg-gold text-navy-900 font-heading font-bold uppercase text-sm text-center"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </nav>
  );
}
