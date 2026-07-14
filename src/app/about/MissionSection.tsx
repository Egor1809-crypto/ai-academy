"use client";

import ScrollReveal from "@/components/ScrollReveal";

const pillars = [
  {
    title: "Юристы будущего уже здесь",
    desc: "AI не заменит юристов, но юристы с AI заменят тех, кто без. Мы готовим профессионалов, которые определят стандарты индустрии.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Практика, а не теория",
    desc: "Каждый навык, который вы получите, применим завтра в вашем деле. Реальные кейсы, реальные инструменты, реальный результат.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Сообщество единомышленников",
    desc: "Юристы нового поколения. Нетворкинг, обмен опытом, совместные проекты и поддержка после обучения.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export default function MissionSection() {
  return (
    <section className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[200px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-cyber-blue/[0.04] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              <span className="text-gold text-xs font-mono uppercase tracking-widest">
                Манифест
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Наша <span className="text-gradient-gold">миссия</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Quote block */}
        <ScrollReveal direction="up" delay={200}>
          <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-cyber-blue/50 via-cyber-blue/15 to-cyber-blue/50 mb-16">
            <div className="bg-navy-900 rounded-2xl p-8 md:p-12">
              {/* Decorative quotes */}
              <svg
                className="absolute top-8 left-8 w-10 h-10 text-gold/10"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
              </svg>
              <p className="text-xl md:text-2xl lg:text-3xl font-heading font-bold text-center leading-relaxed text-white relative z-10">
                Мы верим, что доступ к технологиям искусственного интеллекта
                должен быть у каждого юриста — не только у тех, кто работает в
                международных фирмах. Наша цель — демократизировать AI для
                юридического сообщества России.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <ScrollReveal key={i} delay={300 + i * 100}>
              <div className="bg-white/[0.03] border border-white/10 p-8 h-full hover:border-gold/20 transition-colors duration-300">
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-6">
                  {p.icon}
                </div>
                <h3 className="font-heading font-bold text-lg mb-3 text-gold">
                  {p.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
