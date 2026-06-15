"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const items = [
  {
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "Практикующий юрист",
    tag: "ЮРИСТ",
    pain: "Тратите часы на типовые документы и рутину",
    solution: "Автоматизация 70% рутинных задач с помощью AI",
    metric: "70%",
    metricLabel: "автоматизация рутины",
  },
  {
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    title: "Адвокат",
    tag: "АДВОКАТ",
    pain: "Анализ практики отнимает целые дни",
    solution: "Поиск прецедентов и формирование позиции за минуты",
    metric: "36x",
    metricLabel: "быстрее анализ",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Руководитель юр. отдела",
    tag: "РУКОВОДИТЕЛЬ",
    pain: "Команда тонет в ручной работе",
    solution: "AI-инструменты для всего отдела, рост продуктивности x3",
    metric: "x3",
    metricLabel: "продуктивность",
  },
  {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Арбитражный управляющий",
    tag: "УПРАВЛЯЮЩИЙ",
    pain: "Огромные объёмы данных и документов",
    solution: "AI-анализ финансов, автоматические отчёты",
    metric: "40ч",
    metricLabel: "экономия/мес",
  },
];

export default function Audience() {
  return (
    <section id="about" className="py-14 sm:py-20 md:py-36 bg-navy-800 relative overflow-hidden">
      <SectionParticles id="audience-particles" preset="matrix" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-gold/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyber-purple/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 sm:mb-14 md:mb-20">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/60" />
              <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                Целевая аудитория
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/60" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5">
              Кому необходим <span className="text-gold">этот курс</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Независимо от специализации — AI ускорит вашу работу
            </p>
          </div>
        </ScrollReveal>

        {/* Horizontal stacked cards — unique layout */}
        <div className="space-y-4">
          {items.map((item, i) => (
            <ScrollReveal key={i} direction={i % 2 === 0 ? "left" : "right"} delay={i * 80}>
              <div className="group relative grid md:grid-cols-12 gap-0 bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 transition-all duration-700 overflow-hidden">

                {/* Left — metric highlight */}
                <div className="md:col-span-2 bg-white/[0.02] border-r border-white/[0.06] p-6 md:p-8 flex flex-col items-center justify-center text-center">
                  <div
                    className="text-3xl md:text-4xl font-heading font-black mb-1"
                    style={{
                      background: "linear-gradient(135deg, #00CFFF, #fff)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {item.metric}
                  </div>
                  <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">
                    {item.metricLabel}
                  </span>
                </div>

                {/* Center — content */}
                <div className="md:col-span-8 p-6 md:p-8 relative">
                  {/* Tag */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/15 transition-colors duration-500">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-600 block">
                        {item.tag}
                      </span>
                      <h3 className="font-heading font-bold text-lg text-white group-hover:text-gold transition-colors duration-500">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Pain → Solution */}
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-start gap-2.5">
                      <span className="text-red-500/60 text-xs mt-0.5 shrink-0">✕</span>
                      <p className="text-sm text-gray-500 line-through decoration-gray-700/50">{item.pain}</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-gold text-xs mt-0.5 shrink-0">✓</span>
                      <p className="text-sm text-gray-300">{item.solution}</p>
                    </div>
                  </div>
                </div>

                {/* Right — number */}
                <div className="hidden md:flex md:col-span-2 items-center justify-center border-l border-white/[0.06]">
                  <span className="text-[72px] font-heading font-black text-white/[0.03] select-none leading-none group-hover:text-white/[0.06] transition-colors duration-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Hover bottom line */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent transition-all duration-700" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
