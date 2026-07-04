"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import ScrollReveal from "@/components/ScrollReveal";

const day1 = [
  "Основы промптинга для юридических задач",
  "Анализ договоров и правовых документов с AI",
  "Работа с ChatGPT, Claude и специализированными LLM",
  "Составление промптов под реальные задачи участников",
];

const day2 = [
  "Автоматизация рутинных юридических процессов",
  "Legal Design с помощью нейросетей",
  "Интеграция AI в существующие рабочие процессы",
  "Финальный проект: решение собственного кейса",
];

const includes = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Ноутбуки с AI-инструментами",
    desc: "Все инструменты настроены и готовы к работе. Не нужно ничего устанавливать.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: "Реальные кейсы участников",
    desc: "Работаете со своими документами и задачами, а не абстрактными примерами.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Малые группы до 15 человек",
    desc: "Индивидуальное внимание от эксперта. Каждый получит обратную связь.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: "Сертификат AI Legal",
    desc: "Подтверждение прохождения практикума для вашего портфолио.",
  },
];

export default function WorkshopPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-emerald-500/8 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors text-sm mb-8"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Все продукты
                </Link>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
                    Hands-on
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Практикум{" "}
                  <span className="text-gradient-gold">
                    &laquo;AI-Lab для юристов&raquo;
                  </span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  2 дня интенсивной практики в группе до 15 человек. Вы
                  решаете свои реальные кейсы с помощью AI под руководством
                  экспертов.
                </p>
              </div>
            </ScrollReveal>

            {/* What's included */}
            <ScrollReveal direction="up" delay={200}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Что <span className="text-gold">включено</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-20">
                {includes.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-6 flex gap-4 hover:border-gold/20 transition-colors duration-300"
                  >
                    <div className="w-12 h-12 shrink-0 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold mb-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Program */}
            <ScrollReveal direction="up" delay={300}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Программа <span className="text-gold">практикума</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-20">
                <div className="bg-white/[0.03] border border-white/10 p-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 mb-6">
                    <span className="text-gold text-xs font-mono font-bold">
                      ДЕНЬ 1
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-4">
                    Промптинг и анализ документов
                  </h3>
                  <ul className="space-y-3">
                    {day1.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-gray-400 text-sm"
                      >
                        <svg
                          className="w-4 h-4 text-gold shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/[0.03] border border-white/10 p-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyber-purple/10 border border-cyber-purple/20 mb-6">
                    <span className="text-cyber-purple text-xs font-mono font-bold">
                      ДЕНЬ 2
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-4">
                    Автоматизация и Legal Design
                  </h3>
                  <ul className="space-y-3">
                    {day2.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-gray-400 text-sm"
                      >
                        <svg
                          className="w-4 h-4 text-gold shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Стоимость: <span className="text-gold">35 000 ₽</span>
                </h2>
                <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                  Включает 2 дня практики, рабочие материалы, обеды, доступ к
                  ноутбукам с AI-инструментами и сертификат.
                </p>
                <Link
                  href="/tariffs"
                  className="inline-block px-10 py-4 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(0,207,255,0.3)] hover:shadow-[0_0_50px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                >
                  Записаться в группу
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <FooterCompact />
    </>
  );
}
