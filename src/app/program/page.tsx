"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CTA from "@/components/CTA";
import ScrollReveal from "@/components/ScrollReveal";

const SectionParticles = dynamic(() => import("@/components/SectionParticles"), { ssr: false });

/* ── Program data ──────────────────────────────────────────── */

const modules = [
  {
    num: "01",
    title: "Введение в нейросети для юристов",
    duration: "2 недели",
    hours: "12 часов",
    tools: ["ChatGPT", "Claude", "YandexGPT"],
    color: "gold" as const,
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    description: "Разберётесь, как работают LLM, научитесь писать точные промпты и защищать адвокатскую тайну при работе с нейросетями.",
    items: [
      "Что такое LLM и как они работают (просто о сложном)",
      "Обзор основных инструментов: ChatGPT, Claude, GigaChat, YandexGPT",
      "Безопасность данных и адвокатская тайна при работе с AI",
      "Базовые принципы Prompt Engineering для юристов",
    ],
    result: "Уверенно используете AI-чат для простых задач, знаете границы и риски",
  },
  {
    num: "02",
    title: "AI в судебно-претензионной работе",
    duration: "2 недели",
    hours: "14 часов",
    tools: ["ChatGPT", "Claude", "Perplexity"],
    color: "purple" as const,
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    description: "Научитесь анализировать судебную практику за минуты, генерировать черновики процессуальных документов и находить скрытые закономерности.",
    items: [
      "Анализ судебной практики: поиск скрытых закономерностей",
      "Генерация черновиков исковых заявлений и отзывов",
      "Подготовка правовых позиций на основе загруженных документов",
      "Суммаризация многотомных дел за минуты",
    ],
    result: "Составляете полноценную правовую позицию с AI за 30 минут вместо 3 часов",
  },
  {
    num: "03",
    title: "Договорная работа и комплаенс",
    duration: "2 недели",
    hours: "14 часов",
    tools: ["ChatGPT", "Claude", "Gemini"],
    color: "gold" as const,
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    description: "Освоите Due Diligence с нейросетями: поиск рисков в договорах, проверка контрагентов, генерация документов и сравнение версий.",
    items: [
      "Автоматизированная проверка контрагентов",
      "Поиск рисков и несоответствий в договорах (Due Diligence)",
      "Генерация типовых договоров и дополнительных соглашений",
      "Сравнение версий документов и выявление изменений",
    ],
    result: "Анализируете 50-страничный договор за 5 минут с таблицей рисков",
  },
  {
    num: "04",
    title: "Маркетинг и визуал для юриста",
    duration: "2 недели",
    hours: "10 часов",
    tools: ["Midjourney", "Runway", "Suno"],
    color: "purple" as const,
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    description: "Создавайте контент для соцсетей, презентации для судов и личный бренд юриста — без дизайнера и копирайтера.",
    items: [
      "Создание контент-плана для соцсетей (Telegram, VK)",
      "Генерация постов, статей и кейсов с помощью AI",
      "Midjourney: обложки для статей и презентаций без дизайнера",
      "Основы Legal Design с помощью нейросетей",
    ],
    result: "Ведёте соцсети юрфирмы самостоятельно, тратя 2 часа в неделю вместо 10",
  },
];

const stats = [
  { value: "4", label: "модуля" },
  { value: "8", label: "недель" },
  { value: "50", suffix: "+", label: "часов видео" },
  { value: "40", suffix: "+", label: "практик" },
  { value: "12", label: "спикеров" },
  { value: "∞", label: "доступ к записям" },
];

/* ── Component ─────────────────────────────────────────────── */

const ACCENT = {
  gold: { hex: "#00CFFF", rgb: "0,207,255" },
  purple: { hex: "#7B61FF", rgb: "123,97,255" },
} as const;

export default function ProgramPage() {
  const [active, setActive] = useState(0);
  const m = modules[active];
  const a = ACCENT[m.color];

  return (
    <>
      <Navbar />
      <main className="pt-20">

        {/* ═══════════ HERO SECTION ═══════════ */}
        <section className="relative overflow-hidden bg-black">
          <SectionParticles id="program-hero-particles" preset="constellation" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,207,255,0.06)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="max-w-6xl mx-auto px-6 py-28 md:py-36 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-8">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-40" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold shadow-[0_0_8px_rgba(0,207,255,0.6)]" />
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.35em] text-gray-500">
                    Программа обучения
                  </span>
                  <div className="w-12 h-px bg-gradient-to-r from-gold/40 to-transparent" />
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-black mb-6 leading-[0.95]">
                  <span className="text-white">От нуля до</span>
                  <br />
                  <span
                    style={{
                      background: "linear-gradient(135deg, #00CFFF 0%, #7B61FF 50%, #FF007A 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    AI-юриста
                  </span>
                </h1>

                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
                  8 недель интенсивной практики. Каждый модуль — реальные юридические задачи, решаемые с помощью нейросетей.
                </p>

                {/* Stats ribbon */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 max-w-5xl mx-auto">
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="group relative bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-gold/40 px-3 py-5 md:py-6 text-center transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_28px_rgba(0,207,255,0.15)]"
                    >
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div
                        className="text-4xl md:text-5xl font-heading font-black tabular-nums leading-none mb-2"
                        style={{
                          background: "linear-gradient(135deg, #00CFFF 0%, #8ee9ff 45%, #ffffff 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          filter: "drop-shadow(0 0 14px rgba(0,207,255,0.5))",
                        }}
                      >
                        {s.value}{s.suffix || ""}
                      </div>
                      <span className="text-[10px] md:text-[11px] font-mono text-gray-400 uppercase tracking-[0.12em] group-hover:text-gray-300 transition-colors">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════════ INTERACTIVE MODULES ═══════════ */}
        <section className="relative overflow-hidden bg-navy-900">
          <SectionParticles id="program-modules-particles" preset="fireflies" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyber-purple/[0.03] rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10">

            {/* Section header */}
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
                  <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                    Модули курса
                  </span>
                  <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-black uppercase leading-[0.9] tracking-[-0.01em]">
                  Четыре ступени.{" "}
                  <span
                    className="font-serif-display italic font-medium normal-case"
                    style={{
                      background: "linear-gradient(120deg, #70EFFF 0%, #00CFFF 50%, #FF007A 110%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Одна траектория
                  </span>
                </h2>
                <p className="text-gray-500 text-sm md:text-base mt-4 font-mono uppercase tracking-[0.15em]">
                  Маршрут собирается в систему — модуль за модулем
                </p>
              </div>
            </ScrollReveal>

            {/* Timeline tabs + content */}
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* Left — vertical timeline tabs */}
              <div className="lg:col-span-4">
                {/* Progress header */}
                <div className="flex items-center justify-between mb-5 px-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
                    Маршрут
                  </span>
                  <span className="text-[11px] font-mono text-gray-500 tabular-nums">
                    <span style={{ color: a.hex }}>{String(active + 1).padStart(2, "0")}</span>
                    <span className="text-gray-600"> / {String(modules.length).padStart(2, "0")}</span>
                  </span>
                </div>

                <div className="relative">
                  {/* Vertical track */}
                  <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-white/[0.06] rounded-full" />
                  {/* Progress fill */}
                  <div
                    className="absolute left-[27px] top-6 w-[2px] rounded-full transition-all duration-700"
                    style={{
                      height: `${(active / Math.max(modules.length - 1, 1)) * 100}%`,
                      maxHeight: "calc(100% - 48px)",
                      background: "linear-gradient(to bottom, rgba(0,207,255,0.9), rgba(123,97,255,0.6))",
                    }}
                  />

                  <div className="space-y-1.5">
                    {modules.map((mod, i) => {
                      const isActive = active === i;
                      const isDone = i < active;
                      const ac = ACCENT[mod.color];
                      return (
                        <button
                          key={i}
                          onClick={() => setActive(i)}
                          aria-current={isActive ? "step" : undefined}
                          className={`group w-full flex items-center gap-4 pl-3 pr-3 py-4 text-left rounded-xl transition-all duration-300 cursor-pointer ${
                            isActive ? "bg-white/[0.045]" : "hover:bg-white/[0.025]"
                          }`}
                          style={
                            isActive
                              ? { boxShadow: `inset 3px 0 0 ${ac.hex}, 0 0 26px rgba(${ac.rgb},0.09)` }
                              : undefined
                          }
                        >
                          {/* Badge */}
                          <div
                            className="relative z-10 w-12 h-12 shrink-0 flex items-center justify-center rounded-full border transition-all duration-500"
                            style={{
                              backgroundColor: isActive
                                ? ac.hex
                                : isDone
                                  ? `rgba(${ac.rgb},0.12)`
                                  : "rgba(255,255,255,0.03)",
                              borderColor: isActive
                                ? ac.hex
                                : isDone
                                  ? `rgba(${ac.rgb},0.4)`
                                  : "rgba(255,255,255,0.1)",
                              boxShadow: isActive ? `0 0 22px rgba(${ac.rgb},0.55)` : "none",
                            }}
                          >
                            {isDone ? (
                              <svg className="w-5 h-5" style={{ color: ac.hex }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span
                                className="font-mono text-sm font-bold"
                                style={{ color: isActive ? "#050d1a" : "#6b7280" }}
                              >
                                {mod.num}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                              style={{ color: isActive ? ac.hex : "#6b7280" }}
                            >
                              {mod.duration} · {mod.hours}
                            </span>
                            <h3
                              className={`font-heading font-bold text-sm leading-snug transition-colors ${
                                isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                              }`}
                            >
                              {mod.title}
                            </h3>
                          </div>

                          {/* Active chevron */}
                          <svg
                            className={`w-4 h-4 shrink-0 transition-all duration-300 ${
                              isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                            }`}
                            style={{ color: ac.hex }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right — active module content */}
              <div className="lg:col-span-8">
                <div
                  className="relative rounded-2xl bg-white/[0.02] border overflow-hidden transition-colors duration-500"
                  style={{ borderColor: `rgba(${a.rgb},0.18)`, boxShadow: `0 0 40px rgba(${a.rgb},0.06)` }}
                >
                  <div key={active} className="animate-module-in">
                    {/* Module header */}
                    <div
                      className="relative overflow-hidden px-8 py-7 border-b border-white/[0.06]"
                      style={{ background: `linear-gradient(135deg, rgba(${a.rgb},0.10) 0%, transparent 65%)` }}
                    >
                      {/* shine sweep on switch */}
                      <span
                        className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/[0.06] pointer-events-none"
                        style={{ animation: "sweep-x 0.9s ease-out 0.1s both" }}
                      />
                      <div className="relative flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `rgba(${a.rgb},0.15)`,
                            border: `1px solid rgba(${a.rgb},0.4)`,
                            boxShadow: `0 0 18px rgba(${a.rgb},0.25)`,
                          }}
                        >
                          <svg className="w-7 h-7" style={{ color: a.hex }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={m.icon} />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-1">
                            Модуль {m.num} · {m.duration} · {m.hours}
                          </span>
                          <h3 className="font-heading font-bold text-xl md:text-2xl text-white leading-tight">{m.title}</h3>
                        </div>
                      </div>
                    </div>

                    {/* Content body */}
                    <div className="p-8">
                      <p className="text-gray-300 leading-relaxed mb-8">{m.description}</p>

                      {/* Tools */}
                      <div className="flex flex-wrap gap-2 mb-8">
                        {m.tools.map((tool) => (
                          <span
                            key={tool}
                            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-md"
                            style={{
                              backgroundColor: `rgba(${a.rgb},0.10)`,
                              border: `1px solid rgba(${a.rgb},0.22)`,
                              color: a.hex,
                            }}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>

                      {/* Topics list */}
                      <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
                        Чему научитесь
                      </h4>
                      <ul className="space-y-2.5 mb-8">
                        {m.items.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-3 animate-module-item p-2.5 -mx-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                            style={{ animationDelay: `${120 + j * 80}ms` }}
                          >
                            <div
                              className="w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 rounded-md"
                              style={{
                                backgroundColor: `rgba(${a.rgb},0.10)`,
                                border: `1px solid rgba(${a.rgb},0.3)`,
                              }}
                            >
                              <span className="text-[10px] font-mono font-bold" style={{ color: a.hex }}>
                                {j + 1}
                              </span>
                            </div>
                            <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Result card */}
                      <div
                        className="relative overflow-hidden p-5 rounded-lg border-l-[3px] animate-module-item"
                        style={{
                          borderColor: a.hex,
                          background: `rgba(${a.rgb},0.06)`,
                          animationDelay: `${120 + m.items.length * 80}ms`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4" style={{ color: a.hex }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Результат модуля</span>
                        </div>
                        <p className="text-sm md:text-base text-white font-medium">{m.result}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ LEARNING FORMAT ═══════════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a1628_0%,#050d1a_50%,#0a1628_100%)]" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Side decoration — glow orbs fill the empty margins */}
          <div className="absolute top-1/4 -left-32 w-[420px] h-[420px] bg-gold/[0.06] rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-1/4 -right-32 w-[420px] h-[420px] bg-cyber-purple/[0.05] rounded-full blur-[150px] pointer-events-none" />
          {/* Vertical mono labels on the sides */}
          <span className="hidden xl:block absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-mono uppercase tracking-[0.5em] text-white/15 select-none pointer-events-none">
            AI Legal · Формат
          </span>
          <span className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 rotate-90 origin-center text-[10px] font-mono uppercase tracking-[0.5em] text-white/15 select-none pointer-events-none">
            Доступ навсегда
          </span>

          <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-600">
                    Формат обучения
                  </span>
                  <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-5">
                  Учитесь без отрыва <br className="hidden md:block" />от <span className="text-gold">практики</span>
                </h2>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={80}>
              <p className="text-gray-400 text-base md:text-lg text-center max-w-2xl mx-auto leading-relaxed mb-16">
                Формат собран так, чтобы вы внедряли AI в работу уже во время курса — а не «когда-нибудь после».
                Гибкий темп, живая поддержка и готовые инструменты, которые окупают обучение с первых задач.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
                  num: "01",
                  tag: "50+ часов",
                  title: "Видео в удобном темпе",
                  text: "Ставьте на паузу, пересматривайте сложное, проходите с телефона между заседаниями.",
                  outcome: "Встроите обучение в свой график — ничего не бросая.",
                },
                {
                  icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                  num: "02",
                  tag: "40+ кейсов",
                  title: "Практика на реальных делах",
                  text: "Каждый урок — задача из вашей работы: иск, договор, претензия. Не теория, а навык на завтра.",
                  outcome: "Окупаете курс уже на первых рабочих задачах.",
                },
                {
                  icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
                  num: "03",
                  tag: "Ответ за 24 ч",
                  title: "Личная поддержка кураторов",
                  text: "Закрытый чат с практикующими юристами: разберут ваш кейс, поправят промпт, ответят без воды.",
                  outcome: "Не застрянете в одиночку — рядом эксперт.",
                },
                {
                  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                  num: "04",
                  tag: "200+ промптов",
                  title: "Готовая библиотека промптов",
                  text: "Проверенные шаблоны под юр-задачи: скопировал, подставил данные — получил результат.",
                  outcome: "Экономите часы на формулировках с первого дня.",
                },
              ].map((item, i) => (
                <ScrollReveal key={i} direction="up" delay={i * 110}>
                  <div className="group relative h-full bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 rounded-xl p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_12px_40px_-12px_rgba(0,207,255,0.25)] overflow-hidden">
                    {/* top accent bar grows on hover */}
                    <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-gold via-gold/40 to-transparent transition-all duration-700" />
                    {/* big faint number watermark */}
                    <span className="absolute top-3 right-5 font-heading font-black text-6xl text-white/[0.04] group-hover:text-gold/10 transition-colors duration-500 select-none pointer-events-none tabular-nums">
                      {item.num}
                    </span>

                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:scale-110 group-hover:border-gold/50 transition-all duration-500 shrink-0">
                        <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                        </svg>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-gold/[0.08] border border-gold/20 text-[11px] font-mono uppercase tracking-wider text-gold">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg mb-2 group-hover:text-gold transition-colors duration-500">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-5">{item.text}</p>

                    {/* outcome row — the "why it matters" */}
                    <div className="flex items-start gap-2 pt-4 border-t border-white/[0.06]">
                      <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-sm text-white/90 font-medium leading-snug">{item.outcome}</span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Reinforce line */}
            <ScrollReveal direction="up" delay={120}>
              <p className="text-center text-sm font-mono text-gray-500 mt-12">
                <span className="text-gold">●</span> Все материалы и поддержка — в одном кабинете, доступ остаётся навсегда
              </p>
            </ScrollReveal>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
