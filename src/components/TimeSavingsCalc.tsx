"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";
import { CALC } from "@/data/content";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

// Отзывы выпускников — слева и справа от калькулятора (по бокам, хаотично).
const FLOATING_COMMENTS = [
  {
    initial: "М",
    name: "Марина Кравцова",
    role: "Корпоративный юрист",
    text: "Свела ставку с реальными часами на договорах — вышло под 70 000 ₽ в месяц. Эту работу я больше не беру на выходные.",
    rotate: "xl:-rotate-3",
    accent: "border-gold/25",
    pos: "xl:-left-60 xl:top-2",
  },
  {
    initial: "А",
    name: "Артём Соловьёв",
    role: "Адвокат",
    text: "Первичный анализ дел теперь занимает втрое меньше времени. Освободившиеся часы отдаю клиентам, а не рутине.",
    rotate: "xl:rotate-3",
    accent: "border-cyber-purple/30",
    pos: "xl:-right-60 xl:top-1/4",
  },
  {
    initial: "Е",
    name: "Елена Ветрова",
    role: "Глава юр. отдела",
    text: "Посчитала по всему отделу — годовая экономия вышла как зарплата ещё одного юриста. Для бюджета это весомо.",
    rotate: "xl:rotate-2",
    accent: "border-emerald-500/25",
    pos: "xl:-left-56 xl:bottom-2",
  },
];

function CommentBody({ c }: { c: (typeof FLOATING_COMMENTS)[number] }) {
  return (
    <>
      <Stars />
      <p className="text-base text-gray-100 leading-snug mb-5">«{c.text}»</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-cyber-purple flex items-center justify-center font-heading font-bold text-navy-900 text-sm shrink-0">
          {c.initial}
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">{c.name}</p>
          <p className="text-xs text-gray-500 font-mono">{c.role}</p>
        </div>
      </div>
    </>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5 mb-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3 h-3 text-gold" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.96a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.96c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.96a1 1 0 00-.363-1.118L2.27 9.387c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.96z" />
        </svg>
      ))}
    </div>
  );
}

/* ── SVG corner decorations ─────────────────────────────────── */
function CornerTL() {
  return (
    <svg className="absolute top-0 left-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
      <path d="M0 12V1C0 0.448 0.448 0 1 0H12" stroke="rgba(0,207,255,0.35)" strokeWidth="1.5" />
    </svg>
  );
}
function CornerBR() {
  return (
    <svg className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
      <path d="M24 12V23C24 23.552 23.552 24 23 24H12" stroke="rgba(0,207,255,0.35)" strokeWidth="1.5" />
    </svg>
  );
}

// Стоимость курса для расчёта окупаемости (берём средний тариф).
const COURSE_PRICE = 45000;

export default function TimeSavingsCalc() {
  const [hoursPerWeek, setHoursPerWeek] = useState(20);
  const [rate, setRate] = useState<number>(CALC.avgHourlyRate);

  const results = useMemo(() => {
    const totalDefaultHours = CALC.tasks.reduce((s, t) => s + t.hoursPerWeek, 0);
    const scaleFactor = hoursPerWeek / totalDefaultHours;

    let totalSavedWeekly = 0;
    const breakdown = CALC.tasks.map((task) => {
      const scaledHours = task.hoursPerWeek * scaleFactor;
      const saved = scaledHours * task.aiReduction;
      totalSavedWeekly += saved;
      return {
        name: task.name,
        before: scaledHours,
        after: scaledHours - saved,
        saved,
        percent: Math.round(task.aiReduction * 100),
      };
    });

    const yearlyHoursSaved = totalSavedWeekly * CALC.workWeeksPerYear;
    const yearlySavingsRub = yearlyHoursSaved * rate;
    const monthlyHoursSaved = totalSavedWeekly * 4;
    const monthlySavingsRub = (yearlySavingsRub / 12);
    const freedDaysPerYear = Math.round(yearlyHoursSaved / 8);

    return {
      breakdown,
      totalSavedWeekly: Math.round(totalSavedWeekly * 10) / 10,
      monthlyHoursSaved: Math.round(monthlyHoursSaved),
      monthlySavingsRub: Math.round(monthlySavingsRub),
      yearlyHoursSaved: Math.round(yearlyHoursSaved),
      yearlySavingsRub: Math.round(yearlySavingsRub),
      freedDaysPerYear,
    };
  }, [hoursPerWeek, rate]);

  const roiDays = Math.max(
    1,
    Math.ceil(COURSE_PRICE / (results.monthlySavingsRub / 30)),
  );
  const roiMonths = Math.max(1, Math.ceil(COURSE_PRICE / results.monthlySavingsRub));

  return (
    <section className="py-28 md:py-36 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-navy-800" />
      <SectionParticles id="calc-particles" preset="sparks" />
      <div className="absolute top-0 left-0 w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>
      {/* Ambient glows */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(0,207,255,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse,rgba(123,97,255,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ── Header ── */}
        <ScrollReveal direction="up">
          <div className="text-center mb-16 md:mb-20">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/[0.06] border border-gold/15">
                <svg className="w-3.5 h-3.5 text-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-gold/80 text-[10px] font-mono uppercase tracking-[0.3em]">
                  Калькулятор ROI
                </span>
              </div>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold mb-5 leading-tight">
              Сколько{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #00CFFF 0%, #7B61FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                вы сэкономите
              </span>{" "}
              с AI?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-base">
              Укажите часы рутины и свою ставку — увидите личную выгоду в часах и
              рублях, с прозрачной формулой расчёта
            </p>
          </div>
        </ScrollReveal>

        {/* На широких экранах сужаем калькулятор, чтобы по бокам встали отзывы */}
        <div className="relative xl:max-w-4xl xl:mx-auto">

        {/* Отзывы-«крылья» — слева и справа от калькулятора (только xl+) */}
        {FLOATING_COMMENTS.map((c) => (
          <div
            key={c.name}
            className={`hidden xl:block absolute xl:w-56 z-10 bg-navy-900/90 backdrop-blur-md border ${c.accent} rounded-2xl p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)] transition-all duration-300 hover:rotate-0 hover:z-40 hover:-translate-y-1 ${c.rotate} ${c.pos}`}
          >
            <CommentBody c={c} />
          </div>
        ))}

        <div className="grid lg:grid-cols-5 gap-6 md:gap-8">

          {/* ═══ Left — Slider + Breakdown ═══ */}
          <div className="lg:col-span-3">
            <ScrollReveal direction="up" delay={100}>
              <div className="relative bg-white/[0.02] border border-white/[0.06] p-8 md:p-10">
                <CornerTL />
                <CornerBR />

                {/* Slider */}
                <div className="mb-10">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <label className="text-xs md:text-sm text-gray-400 font-mono uppercase tracking-[0.15em] block mb-1.5">
                        Часов рутины в неделю
                      </label>
                      <p className="text-sm text-gray-500">Типовые документы, анализ, переписка</p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-4xl md:text-5xl font-heading font-black tabular-nums"
                        style={{
                          background: "linear-gradient(135deg, #00CFFF, #fff)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {hoursPerWeek}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">ч</span>
                    </div>
                  </div>

                  {/* Custom range slider */}
                  <div className="relative">
                    {/* Track background */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/[0.06] rounded-full" />
                    {/* Active track with glow */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-gold to-cyber-purple rounded-full shadow-[0_0_10px_rgba(0,207,255,0.3)] transition-all duration-150"
                      style={{ width: `${((hoursPerWeek - 5) / 35) * 100}%` }}
                    />
                    <input
                      type="range"
                      min={5}
                      max={40}
                      step={1}
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                      className="relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-gold
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(0,207,255,0.5)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-white/20
                        [&::-moz-range-thumb]:w-5
                        [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:bg-gold
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-white/20
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-track]:bg-transparent"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-700 font-mono mt-2">
                    <span>5ч</span>
                    <span>40ч</span>
                  </div>
                </div>

                {/* Rate slider */}
                <div className="mb-10">
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <label className="text-xs md:text-sm text-gray-400 font-mono uppercase tracking-[0.15em] block mb-1.5">
                        Ваша ставка
                      </label>
                      <p className="text-sm text-gray-500">Сколько стоит час вашей работы</p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-4xl md:text-5xl font-heading font-black tabular-nums"
                        style={{
                          background: "linear-gradient(135deg, #00CFFF, #fff)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {formatNumber(rate)}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">₽/ч</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/[0.06] rounded-full" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-gold to-cyber-purple rounded-full shadow-[0_0_10px_rgba(0,207,255,0.3)] transition-all duration-150"
                      style={{ width: `${((rate - 1000) / 9000) * 100}%` }}
                    />
                    <input
                      type="range"
                      min={1000}
                      max={10000}
                      step={500}
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-gold
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(0,207,255,0.5)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-white/20
                        [&::-moz-range-thumb]:w-5
                        [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:bg-gold
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-white/20
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-track]:bg-transparent"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-700 font-mono mt-2">
                    <span>1 000 ₽</span>
                    <span>10 000 ₽</span>
                  </div>
                </div>

                {/* Task breakdown */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-px bg-gold/40" />
                    <span className="text-xs md:text-sm text-gray-400 font-mono uppercase tracking-[0.15em]">
                      Экономия по категориям
                    </span>
                  </div>

                  {results.breakdown.map((task) => (
                    <div key={task.name} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base text-gray-300 group-hover:text-white transition-colors">
                          {task.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 font-mono">
                            {task.before.toFixed(1)}ч → {task.after.toFixed(1)}ч
                          </span>
                          <span className="text-sm font-mono font-bold text-gold bg-gold/[0.08] px-2 py-0.5 border border-gold/15">
                            -{task.percent}%
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-white/[0.06] rounded-full transition-all duration-500"
                          style={{ width: `${(task.before / (hoursPerWeek * 0.4)) * 100}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold/60 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(0,207,255,0.2)]"
                          style={{ width: `${(task.after / (hoursPerWeek * 0.4)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Legend */}
                  <div className="flex items-center gap-5 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <div className="w-5 h-1.5 bg-white/[0.06] rounded-full" />
                      Сейчас
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <div className="w-5 h-1.5 bg-gradient-to-r from-gold to-gold/60 rounded-full" />
                      С AI
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* ═══ Right — Results dashboard ═══ */}
          <div className="lg:col-span-2">
            <ScrollReveal direction="up" delay={200}>
              <div className="space-y-5 h-full flex flex-col">

                {/* Main savings card — premium gold border */}
                <div className="relative flex-1 bg-gold/[0.04] border border-gold/20 p-8 md:p-9 shadow-[0_0_40px_rgba(0,207,255,0.06)]">
                  <CornerTL />
                  <CornerBR />

                  <div className="flex items-center gap-2 mb-8">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-40" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                    </span>
                    <span className="text-xs md:text-sm text-gold/90 font-mono uppercase tracking-[0.2em]">
                      Ваша экономия
                    </span>
                  </div>

                  {/* Big number */}
                  <div className="mb-8">
                    <div
                      className="text-5xl md:text-6xl font-heading font-black tabular-nums leading-none"
                      style={{
                        background: "linear-gradient(135deg, #00CFFF 0%, #fff 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: "drop-shadow(0 0 20px rgba(0,207,255,0.15))",
                      }}
                    >
                      {results.totalSavedWeekly}ч
                    </div>
                    <p className="text-base text-gray-400 mt-2">экономии каждую неделю</p>
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-gold/30 via-gold/10 to-transparent mb-6" />

                  {/* Secondary metrics */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="text-2xl font-heading font-bold text-white tabular-nums">
                        {results.monthlyHoursSaved}ч
                      </div>
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mt-1">
                        в месяц
                      </p>
                    </div>
                    <div>
                      <div className="text-2xl font-heading font-bold text-white tabular-nums">
                        {results.freedDaysPerYear}
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mt-0.5">
                        свободных дней/год
                      </p>
                    </div>
                  </div>
                </div>

                {/* Money card */}
                <div className="relative bg-white/[0.02] border border-white/[0.06] p-6 group hover:border-emerald-500/20 transition-colors duration-500">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-gray-600 font-mono uppercase tracking-[0.2em] mb-1.5">
                        Дополнительный доход / год
                      </p>
                      <div className="text-2xl md:text-3xl font-heading font-bold text-white tabular-nums">
                        {formatNumber(results.yearlySavingsRub)}&nbsp;₽
                      </div>
                      <p className="text-[10px] text-gray-700 mt-1 font-mono">
                        ≈ {formatNumber(results.monthlySavingsRub)} ₽/мес · ставка{" "}
                        {formatNumber(rate)} ₽/ч
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-shadow duration-500">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ROI / окупаемость курса */}
                <div className="relative bg-white/[0.02] border border-gold/15 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-gray-600 font-mono uppercase tracking-[0.2em] mb-1">
                        Окупаемость курса
                      </p>
                      <p className="text-sm text-gray-300">
                        Курс ({formatNumber(COURSE_PRICE)} ₽) окупится за{" "}
                        <span className="text-gold font-bold">
                          {roiMonths === 1 ? `${roiDays} дн.` : `${roiMonths} мес.`}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-heading font-black text-gold tabular-nums leading-none">
                        ×{Math.max(1, Math.round(results.yearlySavingsRub / COURSE_PRICE))}
                      </div>
                      <p className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mt-1">
                        возврат за год
                      </p>
                    </div>
                  </div>
                </div>

                {/* Методология — прозрачный расчёт, без «магии ИИ» */}
                <details className="group bg-white/[0.01] border border-white/[0.04] px-5 py-3">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    <span className="font-mono uppercase tracking-[0.15em]">
                      Как мы считаем
                    </span>
                    <svg
                      className="w-4 h-4 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-3 space-y-2 text-[11px] text-gray-500 leading-relaxed">
                    <p>
                      Берём ваши часы рутины и распределяем их по 5 типовым задачам
                      юриста в реальной пропорции. Для каждой задачи применяем
                      процент ускорения с AI (60–90%), подтверждённый на практике
                      выпускников.
                    </p>
                    <p className="font-mono text-gray-600">
                      Сэкономлено/нед = Σ (часы задачи × % ускорения)
                    </p>
                    <p className="font-mono text-gray-600">
                      Доход/год = часы/нед × {CALC.workWeeksPerYear} нед × ваша ставка
                    </p>
                    <p className="text-gray-600">
                      Это ориентир, а не гарантия — итог зависит от вашей практики.
                    </p>
                  </div>
                </details>
              </div>
            </ScrollReveal>
          </div>
        </div>
        </div>

        {/* ═══ Отзывы выпускников — для экранов уже xl показываем сеткой снизу ═══ */}
        <div className="xl:hidden mt-20 md:mt-24">
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/60" />
            <span className="text-sm md:text-base font-heading font-bold uppercase tracking-[0.18em] text-gold">
              Так это работает у выпускников
            </span>
            <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FLOATING_COMMENTS.map((c) => (
              <div
                key={c.name}
                className={`bg-navy-900/85 backdrop-blur-md border ${c.accent} rounded-2xl p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)]`}
              >
                <CommentBody c={c} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
