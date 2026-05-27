"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    num: "01",
    title: "Аудит",
    desc: "Анализируем текущие процессы вашей юрфирмы, выявляем точки для автоматизации и рассчитываем потенциальную экономию.",
  },
  {
    num: "02",
    title: "Стратегия",
    desc: "Разрабатываем дорожную карту внедрения AI-инструментов с учётом специфики вашей практики и бюджета.",
  },
  {
    num: "03",
    title: "Внедрение",
    desc: "Настраиваем AI-воркфлоу, интегрируем с CRM и документооборотом, обучаем команду.",
  },
  {
    num: "04",
    title: "Поддержка",
    desc: "Сопровождаем после внедрения: мониторинг, оптимизация, обновление инструментов.",
  },
];

const results = [
  { metric: "70%", label: "Сокращение времени на рутину" },
  { metric: "3x", label: "Рост производительности" },
  { metric: "40%", label: "Снижение операционных расходов" },
];

export default function AutomationPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-amber-500/8 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

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

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                    B2B
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Автоматизация{" "}
                  <span className="text-gradient-gold">
                    юридического бизнеса
                  </span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Комплексный аудит и внедрение AI-инструментов в вашу
                  юридическую практику. От анализа процессов до полной
                  автоматизации.
                </p>
              </div>
            </ScrollReveal>

            {/* Process Steps */}
            <ScrollReveal direction="up" delay={200}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Как мы <span className="text-gold">работаем</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-20">
                {steps.map((step) => (
                  <div
                    key={step.num}
                    className="bg-white/[0.03] border border-white/10 p-8 hover:border-gold/20 transition-colors duration-300 relative"
                  >
                    <span className="absolute top-4 right-4 text-gold/10 font-heading font-bold text-5xl">
                      {step.num}
                    </span>
                    <h3 className="font-heading font-bold text-xl mb-3 text-gold">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Results */}
            <ScrollReveal direction="up" delay={300}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Результаты <span className="text-gold">клиентов</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-8 text-center"
                  >
                    <p className="text-4xl font-heading font-bold text-gold mb-2">
                      {r.metric}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                      {r.label}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Testimonial */}
            <ScrollReveal direction="up" delay={350}>
              <div className="bg-white/[0.03] border border-white/10 p-8 md:p-10 mb-16 relative">
                <svg
                  className="absolute top-6 left-6 w-8 h-8 text-gold/20"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>
                <div className="pl-12">
                  <p className="text-gray-300 text-lg leading-relaxed mb-4 italic">
                    &laquo;После внедрения AI-инструментов наша команда из 12
                    юристов обрабатывает на 60% больше дел при том же составе.
                    Окупаемость проекта составила 3 месяца.&raquo;
                  </p>
                  <div>
                    <p className="text-white font-heading font-bold">
                      Партнёр юридической фирмы
                    </p>
                    <p className="text-gray-500 text-sm">
                      Москва, практика корпоративного права
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Стоимость:{" "}
                  <span className="text-gold">от 200 000 ₽</span>
                </h2>
                <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                  Точная стоимость зависит от масштаба вашей практики и объёма
                  внедрения. Первичная консультация бесплатно.
                </p>
                <Link
                  href="/tariffs"
                  className="inline-block px-10 py-4 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(0,207,255,0.3)] hover:shadow-[0_0_50px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                >
                  Заказать аудит
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
