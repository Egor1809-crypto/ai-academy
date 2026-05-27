"use client";

import ScrollReveal from "./ScrollReveal";

const experts = [
  {
    name: "Олег Пащенко",
    role: "LegalTech специалист",
    desc: "Внедрение AI в корпоративные процессы. 10+ лет в юриспруденции.",
    initials: "ОП",
  },
  {
    name: "Владислав Галкин",
    role: "AI-дизайнер",
    desc: "Специалист по нейросетям для дизайна и визуального контента юриста.",
    initials: "ВГ",
  },
  {
    name: "Дмитрий Сизов",
    role: "Управляющий партнёр",
    desc: "Эксперт по автоматизации судебно-претензионной работы.",
    initials: "ДС",
  },
  {
    name: "Василий Артин",
    role: "Промпт-инженер",
    desc: "Разработчик специализированных решений для анализа договоров.",
    initials: "ВА",
  },
];

export default function Experts() {
  return (
    <section id="experts" className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-[150px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Эксперты-<span className="text-gold">практики</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Преподаватели с реальным опытом внедрения AI в юридическую практику
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {experts.map((e, i) => (
            <ScrollReveal key={e.name} direction="up" delay={i * 100}>
              <div className="group">
                {/* Expert number */}
                <span className="font-mono text-xs text-gray-600 mb-2 block">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative w-full aspect-[4/5] bg-navy-800 border border-white/10 mb-4 overflow-hidden group-hover:border-gold/30 group-hover:shadow-[0_0_20px_rgba(0,207,255,0.12)] transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/90 z-10" />
                  <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[5]" />

                  <div className="w-full h-full bg-navy-700 flex items-center justify-center relative">
                    {/* SVG Corner Decorations on photo placeholder */}
                    {/* Top-left */}
                    <svg
                      className="absolute top-2 left-2 w-4 h-4 text-gold/50 z-20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M0 10V0h10" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    {/* Top-right */}
                    <svg
                      className="absolute top-2 right-2 w-4 h-4 text-gold/50 z-20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M16 10V0H6" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    {/* Bottom-left */}
                    <svg
                      className="absolute bottom-2 left-2 w-4 h-4 text-gold/50 z-20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M0 6V16h10" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    {/* Bottom-right */}
                    <svg
                      className="absolute bottom-2 right-2 w-4 h-4 text-gold/50 z-20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M16 6V16H6" stroke="currentColor" strokeWidth="1" />
                    </svg>

                    <span className="text-5xl font-heading font-bold text-white/10 group-hover:text-gold/20 transition-colors duration-500">
                      {e.initials}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-5 z-20">
                    <div className="w-8 h-1 bg-gold mb-3 transform origin-left group-hover:scale-x-150 transition-transform duration-500" />
                    <h3 className="font-heading font-bold text-xl uppercase">{e.name}</h3>
                    <p className="text-gold text-sm font-medium mt-1">{e.role}</p>
                    {/* Gold divider under role */}
                    <div className="w-10 h-px bg-gold/40 mt-2" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{e.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
