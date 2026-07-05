"use client";

import { useState } from "react";
import RegistrationModal from "./RegistrationModal";
import CountdownTimer from "./CountdownTimer";
import ScrollReveal from "./ScrollReveal";
import { TARIFFS, COURSE } from "@/data/content";

// FILE: src/components/Tariffs.tsx — VERSION 2.0.0
// Редизайн editorial+циан (Акт 04 «Успокоение»: чистый прайс, один CTA). Реальные тарифы
// Старт/Практик/Внедрение (данные из кампании). Убраны gold/purple/emerald и HUD-уголки.
// Вычет 13% показываем только там, где есть удостоверение о ПК (taxDeductible).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const fmt = (n: number) => n.toLocaleString("ru-RU");

const TIER: Record<string, { tagline: string; icon: string }> = {
  start: { tagline: "старт самому", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  praktik: {
    tagline: "ядро — живые разборы",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
  vnedrenie: {
    tagline: "система под ключ",
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0",
  },
};

type CellValue = boolean | string;
const MATRIX: { label: string; start: CellValue; praktik: CellValue; vnedrenie: CellValue }[] = [
  { label: "8 уроков в записи + обновления", start: true, praktik: true, vnedrenie: true },
  { label: "Обзорный модуль по банкротству", start: true, praktik: true, vnedrenie: true },
  { label: "Чат поддержки потока", start: true, praktik: true, vnedrenie: true },
  { label: "Сертификат Expertum × АСПБ", start: true, praktik: true, vnedrenie: true },
  { label: "Библиотека промптов и шаблонов БФЛ", start: false, praktik: true, vnedrenie: true },
  { label: "Живые практикумы и разборы дел (5–6)", start: false, praktik: true, vnedrenie: true },
  { label: "Блок «Этика, тайна, безопасность»", start: false, praktik: true, vnedrenie: true },
  { label: "Выпускной кейс", start: false, praktik: true, vnedrenie: true },
  { label: "Закрытое комьюнити выпускников", start: false, praktik: true, vnedrenie: true },
  { label: "Удостоверение о ПК + вычет 13%", start: false, praktik: true, vnedrenie: true },
  { label: "Модуль «Свой стек»: MCP, парсер, бот", start: false, praktik: false, vnedrenie: true },
  { label: "Регламент использования ИИ в фирме", start: false, praktik: false, vnedrenie: true },
  { label: "1:1 сессия внедрения / разбор дела", start: false, praktik: false, vnedrenie: true },
];

function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Cell({ value, accent }: { value: CellValue; accent: string }) {
  if (value === true) return <Check className={accent} />;
  if (value === false) return <span className="text-[#e6e6e6]/20">—</span>;
  return <span className="text-sm text-[#e6e6e6]/70 font-mono">{value}</span>;
}

export default function Tariffs({ showComparison = true }: { showComparison?: boolean }) {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <>
      <section id="tariffs" className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
        <div aria-hidden className="absolute top-1/3 right-0 w-[450px] h-[450px] bg-cyber-blue/[0.05] blur-[150px] rounded-full pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-cyber-blue/[0.03] blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* ── Header ── */}
          <ScrollReveal direction="up">
            <div className="mb-12 md:mb-16 max-w-3xl mx-auto text-center">
              <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">тарифы и стоимость</p>
              <h2 className="leading-[0.92] mb-6" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
                <span className="text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(36px, 6vw, 82px)" }}>три ступени — </span>
                <span className="text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(36px, 6vw, 82px)", textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>в систему</span>
              </h2>
              <p className="text-[#e6e6e6]/55 max-w-xl mx-auto text-[16px] leading-relaxed">
                Рассрочка на 12 месяцев без переплат. По «Практику» и «Внедрению» часть стоимости — назад налоговым вычетом 13%.
              </p>
            </div>
          </ScrollReveal>

          {/* ── Countdown ── */}
          <div className="max-w-xs mx-auto mb-12 md:mb-16">
            <p className="text-center text-xs uppercase text-[#e6e6e6]/40 font-mono tracking-widest mb-4">
              Спецпредложение истекает через
            </p>
            <CountdownTimer targetDate={COURSE.offerDeadline} />
          </div>

          {/* ── Cards ── */}
          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {TARIFFS.map((t, i) => {
              const s = TIER[t.id] ?? TIER.start;
              const taxPrice = fmt(Math.round(t.price * 0.87));
              const pop = t.popular;
              return (
                <ScrollReveal key={t.id} direction="up" delay={i * 120}>
                  <div
                    className={`group relative p-6 md:p-8 flex flex-col h-full rounded-2xl backdrop-blur-sm transition-all duration-500 ${
                      pop
                        ? "border-2 border-cyber-blue bg-cyber-blue/[0.05] shadow-[0_0_50px_rgba(0,207,255,0.14)] lg:-translate-y-4"
                        : "border border-white/10 bg-white/[0.02] hover:border-cyber-blue/30"
                    }`}
                  >
                    {pop && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyber-blue text-navy-900 px-5 py-1.5 font-bold text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(0,207,255,0.4)]">
                        Ядро курса
                      </div>
                    )}

                    {/* Head */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${pop ? "bg-cyber-blue/15 border-cyber-blue/30 text-cyber-blue" : "bg-white/[0.04] border-white/15 text-[#e6e6e6]/70"}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                        </svg>
                      </div>
                      <div>
                        <h3 className={pop ? "text-cyber-blue" : "text-white"} style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(24px, 2.4vw, 30px)", letterSpacing: "-0.02em", textTransform: "none", lineHeight: 1 }}>
                          {t.name}
                        </h3>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-[#e6e6e6]/40 mt-1.5">{s.tagline}</p>
                      </div>
                    </div>

                    <p className="text-[#e6e6e6]/55 text-sm mb-6 min-h-[40px] leading-relaxed">{t.desc}</p>

                    {/* Price */}
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className={pop ? "text-cyber-blue" : "text-white"} style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 4.4vw, 56px)", lineHeight: 1, textShadow: pop ? "0 0 40px rgba(0,207,255,0.35)" : "none" }}>
                        {t.priceFormatted}
                      </span>
                      <span className="text-[#e6e6e6]/50 text-xl mb-1">&#8381;</span>
                    </div>
                    <p className="text-xs text-[#e6e6e6]/40 mb-3 font-mono">{t.monthly} &#8381;/мес в рассрочку</p>

                    {t.taxDeductible ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyber-blue/[0.08] border border-cyber-blue/20 rounded-lg mb-6 w-fit">
                        <Check className="w-3.5 h-3.5 text-cyber-blue shrink-0" />
                        <span className="text-xs text-cyber-blue/90 font-mono">≈ {taxPrice} &#8381; с вычетом 13%</span>
                      </div>
                    ) : (
                      <div className="h-[34px] mb-6" />
                    )}

                    {t.bonus && (
                      <div className="bg-cyber-blue/10 border border-cyber-blue/25 rounded-lg p-3 mb-6 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue shrink-0" />
                        <span className="text-xs font-semibold text-cyber-blue">{t.bonus}</span>
                      </div>
                    )}

                    {/* Features */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-px bg-cyber-blue/50" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e6e6e6]/40">Что входит</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className={`shrink-0 mt-0.5 ${pop ? "text-cyber-blue" : "text-cyber-blue/70"}`} />
                          <span className="text-sm text-[#e6e6e6]/75">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setModal(t.name)}
                      className={`w-full py-4 font-bold text-sm rounded-full transition-all duration-300 cursor-pointer ${
                        pop
                          ? "bg-cyber-blue text-navy-900 hover:shadow-[0_0_30px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                          : "border border-white/20 text-white hover:bg-white hover:text-navy-900"
                      }`}
                      style={{ fontFamily: HELV }}
                    >
                      Выбрать «{t.name}»
                    </button>
                    <p className="text-center text-[11px] text-[#e6e6e6]/35 mt-3 font-mono">Гарантия возврата 7 дней</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* ── Comparison matrix — только на /tariffs ── */}
          {showComparison && (
            <ScrollReveal direction="up">
              <div className="mt-24 max-w-5xl mx-auto">
                <div className="text-center mb-10">
                  <h3 className="mb-2" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(24px, 3vw, 34px)", letterSpacing: "-0.02em", textTransform: "none" }}>
                    <span className="text-white">детальное </span><span className="text-cyber-blue">сравнение</span>
                  </h3>
                  <p className="text-[#e6e6e6]/40 text-sm">Всё, что входит в каждый тариф — в одной таблице</p>
                </div>

                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-4 text-xs font-mono uppercase tracking-wider text-[#e6e6e6]/40 font-normal">Возможности</th>
                        <th className="p-4 text-center"><span style={{ fontFamily: HELV, fontWeight: 700 }} className="text-base text-[#e6e6e6]/80">Старт</span></th>
                        <th className="p-4 text-center relative">
                          <div className="absolute inset-0 bg-cyber-blue/[0.06] border-x border-cyber-blue/20" />
                          <span style={{ fontFamily: HELV, fontWeight: 800 }} className="relative text-base text-cyber-blue">Практик</span>
                        </th>
                        <th className="p-4 text-center"><span style={{ fontFamily: HELV, fontWeight: 700 }} className="text-base text-white">Внедрение</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MATRIX.map((row, idx) => (
                        <tr key={row.label} className={`border-t border-white/[0.06] ${idx % 2 === 1 ? "bg-white/[0.015]" : ""}`}>
                          <td className="p-4 text-sm text-[#e6e6e6]/75">{row.label}</td>
                          <td className="p-4 text-center"><div className="flex items-center justify-center"><Cell value={row.start} accent="text-cyber-blue/70" /></div></td>
                          <td className="p-4 text-center relative">
                            <div className="absolute inset-0 bg-cyber-blue/[0.06] border-x border-cyber-blue/20" />
                            <div className="relative flex items-center justify-center"><Cell value={row.praktik} accent="text-cyber-blue" /></div>
                          </td>
                          <td className="p-4 text-center"><div className="flex items-center justify-center"><Cell value={row.vnedrenie} accent="text-cyber-blue/70" /></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Corporate strip ── */}
          <div className="mt-16 max-w-5xl mx-auto text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 px-6 py-3 bg-white/[0.02] border border-white/10 rounded-full text-sm text-[#e6e6e6]/60">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue shrink-0" />
              <span>Корпоративное обучение от 3 человек — <span className="text-cyber-blue font-semibold">индивидуальные условия</span></span>
              <a href="https://t.me/ailegal_academy_bot" target="_blank" rel="noopener noreferrer" className="text-cyber-blue hover:text-white underline underline-offset-2">Узнать</a>
            </div>
          </div>
        </div>
      </section>

      {modal && <RegistrationModal tariff={modal} onClose={() => setModal(null)} />}
    </>
  );
}
