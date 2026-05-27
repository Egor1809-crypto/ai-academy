"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const services = [
  {
    num: "01",
    title: "Разработка промптов под задачи клиента",
    desc: "Создаём библиотеку промптов для вашей юридической специализации: договоры, иски, due diligence, правовые заключения.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "AI-аудит юридических процессов",
    desc: "Анализируем текущие рабочие процессы, находим точки для внедрения AI и рассчитываем ROI автоматизации.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Интеграция нейросетей в CRM и документооборот",
    desc: "Подключаем AI к вашей CRM, системе документооборота и электронной почте для автоматической обработки.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Создание AI-ассистента для юрфирмы",
    desc: "Разрабатываем кастомного AI-ассистента, обученного на ваших документах и процедурах.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Техподдержка и консультации",
    desc: "Постоянная поддержка: обновление промптов, настройка новых инструментов, обучение новых сотрудников.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-violet-500/8 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

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

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                  <span className="text-violet-400 text-xs font-mono uppercase tracking-widest">
                    Сервис
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Услуги команды{" "}
                  <span className="text-gradient-gold">AI Legal</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Разработка промптов, AI-аудит, интеграция нейросетей в
                  бизнес-процессы. Решаем задачи любой сложности.
                </p>
              </div>
            </ScrollReveal>

            {/* Services */}
            <ScrollReveal direction="up" delay={200}>
              <div className="space-y-6 mb-20">
                {services.map((s) => (
                  <div
                    key={s.num}
                    className="bg-white/[0.03] border border-white/10 p-6 md:p-8 flex gap-6 hover:border-gold/20 transition-colors duration-300 group"
                  >
                    <div className="w-14 h-14 shrink-0 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:bg-gold/20 transition-colors duration-300">
                      {s.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-gold/30 font-mono text-xs font-bold">
                          {s.num}
                        </span>
                        <h3 className="font-heading font-bold text-lg">
                          {s.title}
                        </h3>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Стоимость:{" "}
                  <span className="text-gold">от 50 000 ₽ за проект</span>
                </h2>
                <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                  Обсудим вашу задачу и предложим оптимальное решение.
                  Первичная консультация бесплатно.
                </p>
                <Link
                  href="/tariffs"
                  className="inline-block px-10 py-4 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(0,207,255,0.3)] hover:shadow-[0_0_50px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                >
                  Оставить заявку
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
