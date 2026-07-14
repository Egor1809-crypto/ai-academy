"use client";

import ScrollReveal from "./ScrollReveal";
import { TRUST_METRICS } from "@/data/content";

// FILE: src/components/TrustBadges.tsx — VERSION 2.0.0
// Editorial+циан. Метрики оставлены, дублирующий ряд инструментов (был и в UseCases)
// заменён на реальные документы/гарантии курса (Expertum × АСПБ, удостоверение о ПК,
// вычет 13%, 152-ФЗ). Токен gold=#00CFFF (циан).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const BADGE_ICONS: Record<string, string> = {
  "Уроков": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  "Шаблонов БФЛ": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  "Приватность данных": "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  "Гарантия возврата": "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

const badges = TRUST_METRICS.map((m) => ({
  value: m.value,
  label: m.label,
  icon: BADGE_ICONS[m.label] ?? BADGE_ICONS["Выпускников"],
}));

const credentials = [
  "Сертификат Expertum × АСПБ",
  "Удостоверение о ПК + вычет 13%",
  "Работа по 152-ФЗ",
  "Комьюнити сети АСПБ",
];

export default function TrustBadges() {
  return (
    <section className="py-16 bg-navy-800 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {badges.map((b, i) => (
            <ScrollReveal key={b.label} direction="up" delay={i * 100}>
              <div className="text-center group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:border-cyber-blue/30 group-hover:shadow-[0_0_15px_rgba(0,207,255,0.12)] transition-all duration-500">
                  <svg className="w-6 h-6 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={b.icon} />
                  </svg>
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1 tabular-nums" style={{ fontFamily: HELV, letterSpacing: "-0.02em" }}>
                  {b.value}
                </div>
                <div className="text-xs text-[#e6e6e6]/45 tracking-wider font-mono">{b.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="fade" delay={300}>
          <div className="pt-8 border-t border-white/[0.08]">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6 text-center">документы и гарантии</p>
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
              {credentials.map((c) => (
                <span key={c} className="inline-flex items-center gap-2 text-[15px] text-[#e6e6e6]/70">
                  <svg className="w-4 h-4 text-cyber-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
