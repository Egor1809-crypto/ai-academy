"use client";

import { useState } from "react";
import RegistrationModal from "./RegistrationModal";
import CountdownTimer from "./CountdownTimer";
import ScrollReveal from "./ScrollReveal";
import { TARIFFS, COURSE } from "@/data/content";

const fmt = (n: number) => n.toLocaleString("ru-RU");

/* Визуальная схема под каждый тариф (акцент + подзаголовок «для кого»). */
const TIER: Record<
  string,
  { tagline: string; accent: string; ring: string; priceClass: string; iconBox: string; glow: string; icon: string }
> = {
  basic: {
    tagline: "Самостоятельное обучение",
    accent: "text-gray-300",
    ring: "border-white/10 hover:border-white/25",
    priceClass: "text-white",
    iconBox: "bg-white/[0.04] border-white/15 text-gray-300",
    glow: "",
    // молния — быстрый старт
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  },
  premium: {
    tagline: "С поддержкой кураторов",
    accent: "text-gold",
    ring: "border-2 border-gold",
    priceClass: "text-gradient-gold",
    iconBox: "bg-gold/10 border-gold/30 text-gold",
    glow: "shadow-[0_0_50px_rgba(0,207,255,0.14)]",
    // искры — максимум возможностей
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  },
  vip: {
    tagline: "Личное внедрение AI",
    accent: "text-cyber-purple",
    ring: "border border-cyber-purple/30 hover:border-cyber-purple/60",
    priceClass: "text-white",
    iconBox: "bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple",
    glow: "hover:shadow-[0_0_30px_rgba(123,97,255,0.12)]",
    // кубок — высший уровень
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0",
  },
};

/* Матрица сравнения — детальная картина «что входит в каждый тариф». */
type CellValue = boolean | string;
const MATRIX: { label: string; basic: CellValue; premium: CellValue; vip: CellValue }[] = [
  { label: "Все модули программы", basic: true, premium: true, vip: true },
  { label: "Готовые промпты для юристов", basic: "15", premium: "50+", vip: "50+" },
  { label: "Доступ к платформе", basic: "3 мес", premium: "3 мес", vip: "6 мес" },
  { label: "Общий чат участников", basic: true, premium: true, vip: true },
  { label: "Проверка домашних заданий", basic: false, premium: true, vip: true },
  { label: "Закрытые мастермайнды", basic: false, premium: true, vip: true },
  { label: "Сертификат о прохождении", basic: false, premium: true, vip: true },
  { label: "Доступ к AI-сервисам", basic: false, premium: "3 мес", vip: "6 мес" },
  { label: "Готовый сайт для юриста", basic: false, premium: "в подарок", vip: "в подарок" },
  { label: "Индивидуальные консультации", basic: false, premium: false, vip: true },
  { label: "Аудит процессов вашей фирмы", basic: false, premium: false, vip: true },
  { label: "Персональный план внедрения", basic: false, premium: false, vip: true },
  { label: "Поддержка", basic: "Чат", premium: "Куратор", vip: "24/7 приоритет" },
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
  if (value === false) return <span className="text-gray-700">—</span>;
  return <span className="text-sm text-gray-300 font-mono">{value}</span>;
}

/* Угловые SVG-засечки в стиле остального сайта. */
function CornerTL() {
  return (
    <svg className="absolute top-0 left-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
      <path d="M0 12V1C0 .448.448 0 1 0H12" stroke="rgba(0,207,255,0.3)" strokeWidth="1.5" />
    </svg>
  );
}
function CornerBR() {
  return (
    <svg className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
      <path d="M24 12V23C24 23.552 23.552 24 23 24H12" stroke="rgba(0,207,255,0.3)" strokeWidth="1.5" />
    </svg>
  );
}

export default function Tariffs() {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <>
      <section id="tariffs" className="py-14 sm:py-20 md:py-28 bg-tech-grid relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="absolute top-1/3 right-0 w-[450px] h-[450px] bg-cyber-purple/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gold/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* ── Header ── */}
          <ScrollReveal direction="up">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
                <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">
                  Тарифы и стоимость
                </span>
                <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Выберите свой <span className="text-gold">тариф</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Рассрочка на 12 месяцев без переплат. Часть стоимости можно вернуть
                через налоговый вычет 13 %.
              </p>
            </div>
          </ScrollReveal>

          {/* ── Countdown ── */}
          <div className="max-w-xs mx-auto mb-10 md:mb-16">
            <p className="text-center text-xs uppercase text-gray-500 font-mono tracking-widest mb-4">
              Спецпредложение истекает через
            </p>
            <CountdownTimer targetDate={COURSE.offerDeadline} />
          </div>

          {/* ── Cards ── */}
          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {TARIFFS.map((t, i) => {
              const s = TIER[t.id] ?? TIER.basic;
              const taxPrice = fmt(Math.round(t.price * 0.87));
              return (
                <ScrollReveal key={t.id} direction="up" delay={i * 120}>
                  <div
                    className={`group relative p-5 md:p-8 flex flex-col h-full bg-white/[0.03] backdrop-blur-sm transition-all duration-500 ${s.ring} ${s.glow} ${
                      t.popular ? "lg:-translate-y-4" : ""
                    }`}
                  >
                    <CornerTL />
                    <CornerBR />

                    {t.popular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-navy-900 px-5 py-1.5 font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,207,255,0.4)]">
                        Популярный выбор
                      </div>
                    )}

                    {/* Head */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-14 h-14 flex items-center justify-center border ${s.iconBox}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`text-2xl font-heading font-bold uppercase leading-none ${t.popular ? "text-gold" : ""}`}>
                          {t.name}
                        </h3>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mt-1.5">
                          {s.tagline}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-6 min-h-[40px] leading-relaxed">{t.desc}</p>

                    {/* Price */}
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className={`text-5xl font-heading font-black leading-none ${s.priceClass}`}>
                        {t.priceFormatted}
                      </span>
                      <span className="text-gray-400 text-xl mb-1">&#8381;</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 font-mono">
                      или {t.monthly} &#8381;/мес в рассрочку
                    </p>

                    {/* Tax-back anchor — честная выгода */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/[0.07] border border-emerald-500/20 mb-6 w-fit">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-emerald-300/90 font-mono">
                        ≈ {taxPrice} &#8381; с вычетом 13 %
                      </span>
                    </div>

                    {t.bonus && (
                      <div className="bg-gold/10 border border-gold/30 p-3 mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        <span className="text-xs font-bold text-gold uppercase">{t.bonus}</span>
                      </div>
                    )}

                    {/* Features */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-px bg-gold/40" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
                        Что входит
                      </span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className={`shrink-0 mt-0.5 ${s.accent}`} />
                          <span className="text-sm text-gray-300">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setModal(t.name)}
                      className={`w-full py-4 font-bold uppercase text-sm transition-all duration-300 cursor-pointer ${
                        t.popular
                          ? "bg-gold text-navy-900 hover:bg-gold-light shadow-[0_0_20px_rgba(0,207,255,0.3)] hover:shadow-[0_0_30px_rgba(0,207,255,0.5)]"
                          : "border border-white/20 text-white hover:bg-white hover:text-navy-900"
                      }`}
                    >
                      Выбрать {t.name}
                    </button>
                    <p className="text-center text-[11px] text-gray-600 mt-3 font-mono">
                      Гарантия возврата 7 дней
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* ── Comparison matrix ── */}
          <ScrollReveal direction="up">
            <div className="mt-24 max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-heading font-bold mb-2">
                  Детальное <span className="text-gold">сравнение</span>
                </h3>
                <p className="text-gray-500 text-sm">Всё, что входит в каждый тариф — в одной таблице</p>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-4 text-xs font-mono uppercase tracking-wider text-gray-500 font-normal">
                        Возможности
                      </th>
                      <th className="p-4 text-center">
                        <span className="text-base font-heading font-bold uppercase text-gray-300">Базовый</span>
                      </th>
                      <th className="p-4 text-center relative">
                        <div className="absolute inset-0 bg-gold/[0.05] border-x border-gold/20" />
                        <span className="relative text-base font-heading font-bold uppercase text-gold">Премиум</span>
                      </th>
                      <th className="p-4 text-center">
                        <span className="text-base font-heading font-bold uppercase text-cyber-purple">VIP</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX.map((row, idx) => (
                      <tr
                        key={row.label}
                        className={`border-t border-white/[0.06] ${idx % 2 === 1 ? "bg-white/[0.015]" : ""}`}
                      >
                        <td className="p-4 text-sm text-gray-300">{row.label}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Cell value={row.basic} accent="text-gray-400" />
                          </div>
                        </td>
                        <td className="p-4 text-center relative">
                          <div className="absolute inset-0 bg-gold/[0.05] border-x border-gold/20" />
                          <div className="relative flex items-center justify-center">
                            <Cell value={row.premium} accent="text-gold" />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Cell value={row.vip} accent="text-cyber-purple" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>

          {/* ── Corporate strip ── */}
          <div className="mt-16 max-w-5xl mx-auto text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-gray-400">
              <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>
                Корпоративное обучение от 5 человек — <span className="text-gold font-bold">индивидуальные условия</span>
              </span>
              <a href="https://t.me/ailegal_academy_bot" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline underline-offset-2">
                Узнать
              </a>
            </div>
          </div>
        </div>
      </section>

      {modal && <RegistrationModal tariff={modal} onClose={() => setModal(null)} />}
    </>
  );
}
