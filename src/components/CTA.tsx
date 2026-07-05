"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/CTA.tsx — VERSION 2.0.0
// Финал (Акт 04 «Успокоение»): хаос собирается в оффер, один сильный CTA. Editorial+циан,
// убраны gold/purple и HUD-уголки. Копирайт по кампании: дифференциатор + окупаемость,
// без выдуманного «сайта 88 000₽». spotsLeft — реальный API.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export default function CTA() {
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.spotsLeft === "number") setSpotsLeft(d.spotsLeft);
      })
      .catch(() => {});
  }, []);

  const badges = [
    { label: "Гарантия возврата 7 дней", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { label: "Рассрочка 0%", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { label: "Налоговый вычет 13%", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" },
  ];

  return (
    <section className="py-16 sm:py-24 md:py-36 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-black z-0" />
      <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-cyber-blue/[0.07] rounded-full blur-[150px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <ScrollReveal direction="up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-cyber-blue/25 rounded-full mb-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-blue opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-blue" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyber-blue/90">набор открыт</span>
          </div>

          <h2 className="leading-[0.9] mb-8" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.035em" }}>
            <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(48px, 9vw, 130px)" }}>
              из хаоса —
            </span>
            <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(48px, 9vw, 130px)", textShadow: "0 0 70px rgba(0,207,255,0.45)" }}>
              в систему
            </span>
          </h2>

          <p className="text-[#e6e6e6]/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            8 уроков, практикум по банкротству, которого нет ни у кого, и сопровождение до внедрения.
            «Практик» окупается за <span className="text-cyber-blue font-semibold">~19 дней</span> экономии на рутине.
          </p>

          <Link
            href="#tariffs"
            className="group inline-flex items-center gap-3 bg-cyber-blue text-navy-900 rounded-full px-10 py-5 text-lg font-bold transition-all duration-300 hover:shadow-[0_0_60px_-8px_rgba(0,207,255,0.7)] hover:-translate-y-0.5"
            style={{ fontFamily: HELV }}
          >
            Выбрать тариф
            <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          <p className="mt-6 text-sm text-[#e6e6e6]/45 font-mono uppercase tracking-wider">
            {spotsLeft !== null ? `Осталось ${spotsLeft} мест на ближайший поток` : "Места ограничены — набор открыт"}
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs text-[#e6e6e6]/50">
            {badges.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                </svg>
                {b.label}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
