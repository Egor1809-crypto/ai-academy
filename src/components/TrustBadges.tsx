"use client";

import ScrollReveal from "./ScrollReveal";
import { TRUST_METRICS } from "@/data/content";

// FILE: src/components/TrustBadges.tsx — VERSION 2.0.0
// Editorial+циан. Метрики оставлены, дублирующий ряд инструментов (был и в UseCases)
// заменён на реальные документы/гарантии курса (Expertum × АСПБ, удостоверение о ПК,
// вычет 13%, 152-ФЗ). Токен gold=#00CFFF (циан).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const BADGE_ICONS: Record<string, string> = {
  "Выпускников": "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  "Рекомендуют": "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5",
  "Рейтинг курса": "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
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
