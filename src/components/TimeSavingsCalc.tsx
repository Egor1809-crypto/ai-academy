"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";
import { CALC } from "@/data/content";

// FILE: src/components/TimeSavingsCalc.tsx — VERSION 2.0.0
// Редизайн в editorial+циан (Акт 02 «Разгон»): убраны gold/purple/emerald и HUD-уголки,
// один циан-акцент, оверсайз-числа. Задачи заземлены на реальную рутину БФЛ (реестр, отзывы,
// оспаривание сделок 61.2–61.9, Федресурс/КАД). ROI считаем от реального тарифа «Практик».
// Интерактив (ползунки, разбивка, дашборд) сохранён. СОХРАНЕНО: SectionParticles (линии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

// Реальная рутина БФЛ-юриста (сумма часов = 20 — дефолт ползунка)
const BFL_TASKS = [
  { name: "Реестр требований кредиторов", hoursPerWeek: 6, aiReduction: 0.85 },
  { name: "Отзывы и возражения на требования", hoursPerWeek: 4, aiReduction: 0.8 },
  { name: "Жалобы, ходатайства, заявления", hoursPerWeek: 4, aiReduction: 0.75 },
  { name: "Анализ сделок должника (61.2–61.9)", hoursPerWeek: 3, aiReduction: 0.7 },
  { name: "Мониторинг Федресурс · КАД", hoursPerWeek: 3, aiReduction: 0.9 },
];

// Отзывы — «крылья» по бокам калькулятора, подтянуты под БФЛ
const FLOATING_COMMENTS = [
  {
    initial: "М",
    name: "Марина Кравцова",
    role: "Соло-юрист по БФЛ",
    text: "Реестр и отзывы, на которые уходил вечер, собираю за час. Стала вести вдвое больше дел без помощника.",
    rotate: "xl:-rotate-3",
    pos: "xl:-left-60 xl:top-2",
  },
  {
    initial: "А",
    name: "Артём Соловьёв",
    role: "Арбитражный управляющий",
    text: "Отчётность и контроль сроков перестали съедать неделю. По деньгам — как ещё один сотрудник, только за три тысячи.",
    rotate: "xl:rotate-3",
    pos: "xl:-right-60 xl:top-1/4",
  },
  {
    initial: "Е",
    name: "Елена Ветрова",
    role: "Юрфирма по БФЛ",
    text: "Посчитала по команде — за год выходит зарплата ещё одного юриста. Растём делами, а не наймом.",
    rotate: "xl:rotate-2",
    pos: "xl:-left-56 xl:bottom-2",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 mb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3 h-3 text-cyber-blue" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.96a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.96c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.96a1 1 0 00-.363-1.118L2.27 9.387c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.96z" />
        </svg>
      ))}
    </div>
  );
}

function CommentBody({ c }: { c: (typeof FLOATING_COMMENTS)[number] }) {
  return (
    <>
      <Stars />
      <p className="text-[15px] text-[#f4f2ec] leading-snug mb-5">«{c.text}»</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-cyber-blue flex items-center justify-center font-bold text-navy-900 text-sm shrink-0" style={{ fontFamily: HELV }}>
          {c.initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: HELV }}>{c.name}</p>
          <p className="text-xs text-cyber-blue/60 font-mono">{c.role}</p>
        </div>
      </div>
    </>
  );
}

const SLIDER_CLASS =
  "relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 " +
  "[&::-webkit-slider-thumb]:bg-cyber-blue [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(0,207,255,0.6)] [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 " +
  "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-cyber-blue " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/20 " +
  "[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-track]:bg-transparent";

// Реальный тариф «Практик» — от него считаем окупаемость
const COURSE_PRICE = 24900;

export default function TimeSavingsCalc() {
  const [hoursPerWeek, setHoursPerWeek] = useState(20);
  const [rate, setRate] = useState<number>(CALC.avgHourlyRate);

  const results = useMemo(() => {
    const totalDefaultHours = BFL_TASKS.reduce((s, t) => s + t.hoursPerWeek, 0);
    const scaleFactor = hoursPerWeek / totalDefaultHours;

    let totalSavedWeekly = 0;
    const breakdown = BFL_TASKS.map((task) => {
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
    const monthlySavingsRub = yearlySavingsRub / 12;
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

  const roiDays = Math.max(1, Math.ceil(COURSE_PRICE / (results.monthlySavingsRub / 30)));
  const roiMonths = Math.max(1, Math.ceil(COURSE_PRICE / results.monthlySavingsRub));

  return (
    <section className="py-14 sm:py-20 md:py-36 relative overflow-hidden bg-navy-900" style={{ fontFamily: HELV }}>
      <SectionParticles id="calc-particles" preset="sparks" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyber-blue/[0.05] blur-[150px] rounded-full pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-cyber-blue/[0.03] blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* ── Header — editorial ── */}
        <ScrollReveal direction="up">
          <div className="mb-14 md:mb-20 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">калькулятор экономии</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="font-serif-display italic block text-[#e6e6e6]/50 mb-2" style={{ fontSize: "clamp(22px, 3vw, 42px)" }}>
                сколько времени
              </span>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 6.4vw, 92px)" }}>
                съедает
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(42px, 6.6vw, 94px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                рутина?
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Двиньте ползунки под свою практику — увидите, сколько часов и денег возвращает система. Формула расчёта — открытая.
            </p>
          </div>
        </ScrollReveal>

        {/* На широких экранах сужаем калькулятор, чтобы по бокам встали отзывы */}
        <div className="relative xl:max-w-4xl xl:mx-auto">
          {/* Отзывы-«крылья» (только xl+) */}
          {FLOATING_COMMENTS.map((c) => (
            <div
              key={c.name}
              className={`hidden xl:block absolute xl:w-56 z-10 bg-navy-900/90 backdrop-blur-md border border-cyber-blue/20 rounded-2xl p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)] transition-all duration-300 hover:rotate-0 hover:z-40 hover:-translate-y-1 hover:border-cyber-blue/40 ${c.rotate} ${c.pos}`}
            >
              <CommentBody c={c} />
            </div>
          ))}

          <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
            {/* ═══ Left — Sliders + Breakdown ═══ */}
            <div className="lg:col-span-3">
              <ScrollReveal direction="up" delay={100}>
                <div className="relative bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 md:p-10">
                  {/* Hours slider */}
                  <div className="mb-10">
                    <div className="flex justify-between items-end mb-5">
                      <div>
                        <label className="text-xs md:text-sm text-[#e6e6e6]/70 font-mono uppercase tracking-[0.15em] block mb-1.5">
                          Часов рутины в неделю
                        </label>
                        <p className="text-sm text-[#e6e6e6]/40">Реестры, отзывы, жалобы, мониторинг</p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl md:text-5xl font-black tabular-nums text-cyber-blue" style={{ fontFamily: HELV, textShadow: "0 0 30px rgba(0,207,255,0.35)" }}>
                          {hoursPerWeek}
                        </span>
                        <span className="text-[#e6e6e6]/40 text-sm ml-1">ч</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/[0.08] rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-1 bg-cyber-blue rounded-full shadow-[0_0_10px_rgba(0,207,255,0.4)]" style={{ width: `${((hoursPerWeek - 5) / 35) * 100}%` }} />
                      <input type="range" min={5} max={40} step={1} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(Number(e.target.value))} className={SLIDER_CLASS} />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#e6e6e6]/30 font-mono mt-2">
                      <span>5ч</span>
                      <span>40ч</span>
                    </div>
                  </div>

                  {/* Rate slider */}
                  <div className="mb-10">
                    <div className="flex justify-between items-end mb-5">
                      <div>
                        <label className="text-xs md:text-sm text-[#e6e6e6]/70 font-mono uppercase tracking-[0.15em] block mb-1.5">
                          Ваша ставка
                        </label>
                        <p className="text-sm text-[#e6e6e6]/40">Сколько стоит час вашей работы</p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl md:text-5xl font-black tabular-nums text-cyber-blue" style={{ fontFamily: HELV, textShadow: "0 0 30px rgba(0,207,255,0.35)" }}>
                          {formatNumber(rate)}
                        </span>
                        <span className="text-[#e6e6e6]/40 text-sm ml-1">₽/ч</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/[0.08] rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-1 bg-cyber-blue rounded-full shadow-[0_0_10px_rgba(0,207,255,0.4)]" style={{ width: `${((rate - 1000) / 9000) * 100}%` }} />
                      <input type="range" min={1000} max={10000} step={500} value={rate} onChange={(e) => setRate(Number(e.target.value))} className={SLIDER_CLASS} />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#e6e6e6]/30 font-mono mt-2">
                      <span>1 000 ₽</span>
                      <span>10 000 ₽</span>
                    </div>
                  </div>

                  {/* Task breakdown */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-px bg-cyber-blue/50" />
                      <span className="text-xs md:text-sm text-[#e6e6e6]/70 font-mono uppercase tracking-[0.15em]">
                        Экономия по задачам БФЛ
                      </span>
                    </div>

                    {results.breakdown.map((task) => (
                      <div key={task.name} className="group">
                        <div className="flex justify-between items-center mb-2 gap-3">
                          <span className="text-[15px] text-[#e6e6e6]/75 group-hover:text-white transition-colors">{task.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-[#e6e6e6]/40 font-mono">
                              {task.before.toFixed(1)}ч → {task.after.toFixed(1)}ч
                            </span>
                            <span className="text-sm font-mono font-bold text-cyber-blue bg-cyber-blue/[0.1] px-2 py-0.5 border border-cyber-blue/20 rounded">
                              -{task.percent}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-white/[0.08] rounded-full transition-all duration-500" style={{ width: `${(task.before / (hoursPerWeek * 0.4)) * 100}%` }} />
                          <div className="absolute inset-y-0 left-0 bg-cyber-blue rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(0,207,255,0.3)]" style={{ width: `${(task.after / (hoursPerWeek * 0.4)) * 100}%` }} />
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-5 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs text-[#e6e6e6]/40 font-mono">
                        <div className="w-5 h-1.5 bg-white/[0.08] rounded-full" />
                        Сейчас
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#e6e6e6]/40 font-mono">
                        <div className="w-5 h-1.5 bg-cyber-blue rounded-full" />
                        С системой
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
                  {/* Main savings card */}
                  <div className="relative flex-1 bg-cyber-blue/[0.05] border border-cyber-blue/25 rounded-2xl p-5 md:p-9 shadow-[0_0_40px_rgba(0,207,255,0.06)]">
                    <div className="flex items-center gap-2 mb-8">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-blue opacity-40" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-blue" />
                      </span>
                      <span className="text-xs md:text-sm text-cyber-blue/90 font-mono uppercase tracking-[0.2em]">
                        Ваша экономия
                      </span>
                    </div>

                    <div className="mb-8">
                      <div className="text-5xl md:text-6xl font-black tabular-nums leading-none text-cyber-blue" style={{ fontFamily: HELV, textShadow: "0 0 40px rgba(0,207,255,0.4)" }}>
                        {results.totalSavedWeekly}ч
                      </div>
                      <p className="text-base text-[#e6e6e6]/55 mt-2">экономии каждую неделю</p>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-cyber-blue/30 via-cyber-blue/10 to-transparent mb-6" />

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <div className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: HELV }}>{results.monthlyHoursSaved}ч</div>
                        <p className="text-xs text-[#e6e6e6]/40 font-mono uppercase tracking-wider mt-1">в месяц</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: HELV }}>{results.freedDaysPerYear}</div>
                        <p className="text-[10px] text-[#e6e6e6]/40 font-mono uppercase tracking-wider mt-0.5">свободных дней/год</p>
                      </div>
                    </div>
                  </div>

                  {/* Money card */}
                  <div className="relative bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 group hover:border-cyber-blue/30 transition-colors duration-500">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] text-[#e6e6e6]/40 font-mono uppercase tracking-[0.2em] mb-1.5">Дополнительный доход / год</p>
                        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums" style={{ fontFamily: HELV }}>
                          {formatNumber(results.yearlySavingsRub)}&nbsp;₽
                        </div>
                        <p className="text-[10px] text-[#e6e6e6]/40 mt-1 font-mono">
                          ≈ {formatNumber(results.monthlySavingsRub)} ₽/мес · ставка {formatNumber(rate)} ₽/ч
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-cyber-blue/[0.1] border border-cyber-blue/20 rounded-xl flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(0,207,255,0.15)] transition-shadow duration-500">
                        <svg className="w-6 h-6 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* ROI / окупаемость */}
                  <div className="relative bg-white/[0.02] border border-cyber-blue/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] text-[#e6e6e6]/40 font-mono uppercase tracking-[0.2em] mb-1">Окупаемость курса</p>
                        <p className="text-sm text-[#e6e6e6]/75">
                          Тариф «Практик» ({formatNumber(COURSE_PRICE)} ₽) окупится за{" "}
                          <span className="text-cyber-blue font-bold">
                            {roiMonths === 1 ? `${roiDays} дн.` : `${roiMonths} мес.`}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-cyber-blue tabular-nums leading-none" style={{ fontFamily: HELV }}>
                          ×{Math.max(1, Math.round(results.yearlySavingsRub / COURSE_PRICE))}
                        </div>
                        <p className="text-[9px] text-[#e6e6e6]/40 font-mono uppercase tracking-wider mt-1">возврат за год</p>
                      </div>
                    </div>
                  </div>

                  {/* Методология */}
                  <details className="group bg-white/[0.01] border border-white/[0.06] rounded-2xl px-5 py-3">
                    <summary className="flex items-center justify-between cursor-pointer list-none text-xs text-[#e6e6e6]/40 hover:text-[#e6e6e6]/70 transition-colors">
                      <span className="font-mono uppercase tracking-[0.15em]">Как мы считаем</span>
                      <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-3 space-y-2 text-[11px] text-[#e6e6e6]/45 leading-relaxed">
                      <p>Берём ваши часы рутины и распределяем по 5 реальным задачам БФЛ в рабочей пропорции. Для каждой применяем процент ускорения с ИИ (70–90%).</p>
                      <p className="font-mono text-[#e6e6e6]/35">Сэкономлено/нед = Σ (часы задачи × % ускорения)</p>
                      <p className="font-mono text-[#e6e6e6]/35">Доход/год = часы/нед × {CALC.workWeeksPerYear} нед × ваша ставка</p>
                      <p className="text-[#e6e6e6]/35">Это ориентир, а не гарантия — итог зависит от вашей практики.</p>
                    </div>
                  </details>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* ═══ Отзывы — сеткой снизу для экранов уже xl ═══ */}
        <div className="xl:hidden mt-20 md:mt-24">
          <div className="flex items-center gap-3 mb-10">
            <span className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60">так это работает у практиков</span>
            <div className="flex-1 h-px bg-gradient-to-r from-cyber-blue/30 to-transparent" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FLOATING_COMMENTS.map((c) => (
              <div key={c.name} className="bg-navy-800/85 backdrop-blur-md border border-cyber-blue/20 rounded-2xl p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
                <CommentBody c={c} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
