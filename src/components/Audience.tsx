"use client";

import ScrollReveal from "./ScrollReveal";

const items = [
  {
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "Практикующий юрист",
    tag: "ЮРИСТ",
    pain: "Тратите часы на типовые документы и рутину",
    solution: "Автоматизация 70% рутинных задач с помощью AI",
  },
  {
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    title: "Адвокат",
    tag: "АДВОКАТ",
    pain: "Анализ практики отнимает целые дни",
    solution: "Поиск прецедентов и формирование позиции за минуты",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Руководитель юр. отдела",
    tag: "РУКОВОДИТЕЛЬ",
    pain: "Команда тонет в ручной работе",
    solution: "AI-инструменты для всего отдела, рост продуктивности x3",
  },
  {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Арбитражный управляющий",
    tag: "УПРАВЛЯЮЩИЙ",
    pain: "Огромные объёмы данных и документов",
    solution: "AI-анализ финансов, автоматические отчёты",
  },
];

export default function Audience() {
  return (
    <section id="about" className="py-28 bg-navy-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-gold/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Кому необходим <span className="text-gold">этот курс</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Независимо от специализации — AI ускорит вашу работу
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 80}>
              <div
                className="group relative p-6 bg-white/[0.03] backdrop-blur-sm border border-white/5 hover:border-gold/30 hover:shadow-[0_0_20px_rgba(0,207,255,0.12)] transition-all duration-500"
              >
                {/* SVG Corner Decoration — top-left */}
                <svg
                  className="absolute top-0 left-0 w-5 h-5 text-gold/30 group-hover:text-gold/60 transition-colors duration-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M0 12V0h12" stroke="currentColor" strokeWidth="1" />
                </svg>

                {/* SVG Corner Decoration — bottom-right */}
                <svg
                  className="absolute bottom-0 right-0 w-5 h-5 text-gold/30 group-hover:text-gold/60 transition-colors duration-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 8V20H8" stroke="currentColor" strokeWidth="1" />
                </svg>

                <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Tag label */}
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gray-600 mb-3 block">
                    {item.tag}
                  </span>

                  {/* Icon wrapped in bordered square */}
                  <div className="w-12 h-12 flex items-center justify-center border border-gold/20 bg-gold/10 mb-5">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>

                  <h3 className="font-heading font-bold text-lg mb-4 text-gold">{item.title}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-cyber-purple text-xs mt-1 shrink-0">&#x2715;</span>
                      <p className="text-sm text-gray-500 line-through decoration-gray-700">{item.pain}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gold text-xs mt-1 shrink-0">&#x2713;</span>
                      <p className="text-sm text-gray-300">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
