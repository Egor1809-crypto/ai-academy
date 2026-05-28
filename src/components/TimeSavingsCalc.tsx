"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";
import { CALC } from "@/data/content";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
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

export default function TimeSavingsCalc() {
  const [hoursPerWeek, setHoursPerWeek] = useState(20);

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
    const yearlySavingsRub = yearlyHoursSaved * CALC.avgHourlyRate;
    const monthlyHoursSaved = totalSavedWeekly * 4;
    const freedDaysPerYear = Math.round(yearlyHoursSaved / 8);

    return {
      breakdown,
      totalSavedWeekly: Math.round(totalSavedWeekly * 10) / 10,
      monthlyHoursSaved: Math.round(monthlyHoursSaved),
      yearlyHoursSaved: Math.round(yearlyHoursSaved),
      yearlySavingsRub: Math.round(yearlySavingsRub),
      freedDaysPerYear,
    };
  }, [hoursPerWeek]);

  const roiMonths = Math.max(1, Math.ceil(45000 / (results.yearlySavingsRub / 12)));

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
              Передвиньте ползунок — узнайте реальную цену рутины
            </p>
          </div>
        </ScrollReveal>

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
                      <label className="text-[10px] text-gray-600 font-mono uppercase tracking-[0.2em] block mb-1">
                        Часов рутины в неделю
                      </label>
                      <p className="text-xs text-gray-500">Типовые документы, анализ, переписка</p>
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

                {/* Task breakdown */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-px bg-gold/40" />
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">
                      Экономия по категориям
                    </span>
                  </div>

                  {results.breakdown.map((task) => (
                    <div key={task.name} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                          {task.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-mono">
                            {task.before.toFixed(1)}ч → {task.after.toFixed(1)}ч
                          </span>
                          <span className="text-xs font-mono font-bold text-gold bg-gold/[0.08] px-2 py-0.5 border border-gold/15">
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
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                      <div className="w-5 h-1.5 bg-white/[0.06] rounded-full" />
                      Сейчас
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
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
                    <span className="text-[10px] text-gold/80 font-mono uppercase tracking-[0.3em]">
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
                    <p className="text-sm text-gray-500 mt-2">экономии каждую неделю</p>
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-gold/30 via-gold/10 to-transparent mb-6" />

                  {/* Secondary metrics */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="text-2xl font-heading font-bold text-white tabular-nums">
                        {results.monthlyHoursSaved}ч
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mt-0.5">
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
                        при ставке {formatNumber(CALC.avgHourlyRate)} ₽/час
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-shadow duration-500">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ROI badge */}
                <div className="bg-white/[0.01] border border-white/[0.04] px-5 py-3 text-center">
                  <p className="text-xs text-gray-500">
                    Курс окупается за{" "}
                    <span className="text-gold font-bold">{roiMonths}</span>{" "}
                    {roiMonths === 1 ? "месяц" : roiMonths < 5 ? "месяца" : "месяцев"}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
