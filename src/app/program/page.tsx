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

export default function ProgramPage() {
  const [active, setActive] = useState(0);
  const m = modules[active];

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
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
                  {stats.map((s, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] px-4 py-4">
                      <div
                        className="text-2xl md:text-3xl font-heading font-black"
                        style={{
                          background: "linear-gradient(135deg, #00CFFF, #fff)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {s.value}{s.suffix || ""}
                      </div>
                      <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">{s.label}</span>
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
                  <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-600">
                    Модули курса
                  </span>
                  <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold">
                  4 модуля — <span className="text-gold">полная система</span>
                </h2>
              </div>
            </ScrollReveal>

            {/* Timeline tabs + content */}
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">

              {/* Left — vertical timeline tabs */}
              <div className="lg:col-span-4">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-white/[0.06]" />
                  {/* Progress fill */}
                  <div
                    className="absolute left-[19px] top-4 w-[2px] bg-gradient-to-b from-gold via-cyber-purple to-gold transition-all duration-700"
                    style={{ height: `${((active + 1) / modules.length) * 100}%`, maxHeight: "calc(100% - 32px)" }}
                  />

                  <div className="space-y-2">
                    {modules.map((mod, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`group w-full flex items-start gap-5 px-4 py-5 text-left transition-all duration-500 cursor-pointer relative ${
                          active === i
                            ? "bg-white/[0.04] border border-gold/20"
                            : "border border-transparent hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Dot on timeline */}
                        <div className={`relative z-10 w-10 h-10 shrink-0 flex items-center justify-center border transition-all duration-500 ${
                          active === i
                            ? "bg-gold/20 border-gold/50 shadow-[0_0_15px_rgba(0,207,255,0.3)]"
                            : i < active
                              ? "bg-gold/10 border-gold/30"
                              : "bg-white/5 border-white/10"
                        }`}>
                          {i < active ? (
                            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className={`font-mono text-sm font-bold ${active === i ? "text-gold" : "text-gray-600"}`}>
                              {mod.num}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono uppercase tracking-wider ${
                              active === i ? "text-gold" : "text-gray-600"
                            }`}>
                              {mod.duration} · {mod.hours}
                            </span>
                          </div>
                          <h3 className={`font-heading font-bold text-sm leading-snug transition-colors ${
                            active === i ? "text-gold" : "text-gray-300 group-hover:text-white"
                          }`}>
                            {mod.title}
                          </h3>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — active module content */}
              <div className="lg:col-span-8">
                <div className="relative bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                  {/* Corner accents */}
                  <svg className="absolute top-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
                    <path d="M0 16V1.5C0 0.672 0.672 0 1.5 0H16" stroke="rgba(0,207,255,0.4)" strokeWidth="1.5" />
                  </svg>
                  <svg className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
                    <path d="M32 16V30.5C32 31.328 31.328 32 30.5 32H16" stroke="rgba(0,207,255,0.4)" strokeWidth="1.5" />
                  </svg>

                  {/* Module header */}
                  <div className={`px-8 py-6 border-b border-white/[0.06] ${
                    m.color === "purple" ? "bg-cyber-purple/[0.03]" : "bg-gold/[0.03]"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 flex items-center justify-center ${
                        m.color === "purple"
                          ? "bg-cyber-purple/10 border border-cyber-purple/30"
                          : "bg-gold/10 border border-gold/30"
                      }`}>
                        <svg className={`w-7 h-7 ${m.color === "purple" ? "text-cyber-purple" : "text-gold"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={m.icon} />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider block">
                          Модуль {m.num} · {m.duration}
                        </span>
                        <h3 className="font-heading font-bold text-xl md:text-2xl text-white">{m.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Content body */}
                  <div className="p-8">
                    <p className="text-gray-400 leading-relaxed mb-8">{m.description}</p>

                    {/* Tools */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {m.tools.map((tool) => (
                        <span
                          key={tool}
                          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${
                            m.color === "purple"
                              ? "bg-cyber-purple/10 border border-cyber-purple/20 text-cyber-purple"
                              : "bg-gold/10 border border-gold/20 text-gold"
                          }`}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>

                    {/* Topics list */}
                    <h4 className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-4">
                      Чему научитесь
                    </h4>
                    <ul className="space-y-4 mb-8">
                      {m.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <div className={`w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 ${
                            m.color === "purple"
                              ? "bg-cyber-purple/10 border border-cyber-purple/20"
                              : "bg-gold/10 border border-gold/20"
                          }`}>
                            <span className={`text-[10px] font-mono font-bold ${
                              m.color === "purple" ? "text-cyber-purple" : "text-gold"
                            }`}>
                              {j + 1}
                            </span>
                          </div>
                          <span className="text-gray-300 text-sm leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Result card */}
                    <div className={`p-5 border-l-[3px] ${
                      m.color === "purple"
                        ? "border-cyber-purple bg-cyber-purple/[0.04]"
                        : "border-gold bg-gold/[0.04]"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-4 h-4 ${m.color === "purple" ? "text-cyber-purple" : "text-gold"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600">Результат модуля</span>
                      </div>
                      <p className="text-sm text-white font-medium">{m.result}</p>
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

          <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-600">
                    Формат обучения
                  </span>
                  <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-5">
                  Как проходит <span className="text-gold">обучение</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
                  title: "Видеоуроки",
                  text: "50+ часов записей от практикующих юристов. Смотрите в своём темпе, с любого устройства.",
                },
                {
                  icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                  title: "Практика на реальных задачах",
                  text: "Каждый урок — конкретная задача из юрпрактики. Делаете руками, получаете обратную связь.",
                },
                {
                  icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
                  title: "Поддержка и менторство",
                  text: "Закрытый чат с преподавателями. Разбор ваших кейсов, ответы на вопросы в течение 24 часов.",
                },
                {
                  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                  title: "Библиотека промптов",
                  text: "200+ готовых промптов для юристов. Копируйте, адаптируйте, используйте в работе сразу.",
                },
              ].map((item, i) => (
                <ScrollReveal key={i} direction={i % 2 === 0 ? "left" : "right"} delay={i * 80}>
                  <div className="group bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 p-7 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent transition-all duration-700" />
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2 group-hover:text-gold transition-colors duration-500">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
