"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import ScrollReveal from "@/components/ScrollReveal";

const programBlocks = [
  {
    time: "10:00 — 12:00",
    title: "Теория AI для юристов",
    items: [
      "Как работают LLM: ChatGPT, Claude, GigaChat",
      "Правовые аспекты использования AI",
      "Обзор инструментов для юридической практики",
    ],
  },
  {
    time: "12:00 — 13:30",
    title: "Live-демо с реальными кейсами",
    items: [
      "Анализ договора за 3 минуты",
      "Генерация правовой позиции",
      "Поиск по судебной практике через AI",
    ],
  },
  {
    time: "14:30 — 16:30",
    title: "Практика в парах",
    items: [
      "Работа с собственными документами",
      "Составление промптов под задачи",
      "Обезличивание данных для AI",
    ],
  },
  {
    time: "16:30 — 18:00",
    title: "Q&A + Нетворкинг",
    items: [
      "Ответы на вопросы участников",
      "Обмен контактами и опытом",
      "Сертификаты участников",
    ],
  },
];

const dates = [
  { date: "28 июня 2026", city: "Саратов", spots: 8 },
  { date: "19 июля 2026", city: "Саратов", spots: 15 },
  { date: "TBD", city: "Москва", spots: null },
];

export default function SeminarPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-cyber-blue/10 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors text-sm mb-8"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Все продукты
                </Link>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyber-blue/10 border border-cyber-blue/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-pulse" />
                  <span className="text-cyber-blue text-xs font-mono uppercase tracking-widest">
                    Оффлайн
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Живой семинар{" "}
                  <span className="text-gradient-gold">
                    &laquo;AI-революция в юриспруденции&raquo;
                  </span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                  Однодневное погружение в мир нейросетей для юристов. Первый в
                  России живой формат: теория, практика и нетворкинг в одном
                  мероприятии.
                </p>

                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg
                      className="w-5 h-5 text-gold"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Саратов
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg
                      className="w-5 h-5 text-gold"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    10:00 — 18:00
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg
                      className="w-5 h-5 text-gold"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                      />
                    </svg>
                    Обед включён
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Program */}
            <ScrollReveal direction="up" delay={200}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Программа <span className="text-gold">дня</span>
              </h2>
              <div className="space-y-6 mb-20">
                {programBlocks.map((block, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-6 md:p-8 hover:border-gold/20 transition-colors duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                      <div className="shrink-0">
                        <span className="text-gold font-mono text-sm font-bold">
                          {block.time}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg mb-3">
                          {block.title}
                        </h3>
                        <ul className="space-y-2">
                          {block.items.map((item, j) => (
                            <li
                              key={j}
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
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Dates */}
            <ScrollReveal direction="up" delay={300}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Ближайшие <span className="text-gold">даты</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mb-20">
                {dates.map((d, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-6 text-center hover:border-gold/20 transition-colors duration-300"
                  >
                    <p className="text-gold font-heading font-bold text-xl mb-2">
                      {d.date}
                    </p>
                    <p className="text-gray-300 text-sm mb-3">{d.city}</p>
                    {d.spots !== null ? (
                      <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-3 py-1 border border-amber-400/20">
                        Осталось {d.spots} мест
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 border border-white/10">
                        Скоро откроется
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Pricing */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-12 text-center mb-16">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Стоимость <span className="text-gold">участия</span>
                </h2>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                  <div>
                    <p className="text-gray-500 text-sm line-through mb-1">
                      15 000 ₽
                    </p>
                    <p className="text-4xl font-heading font-bold text-gold">
                      12 000 ₽
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      Ранняя регистрация
                    </p>
                  </div>
                  <div className="hidden md:block w-px h-16 bg-white/10" />
                  <div>
                    <p className="text-4xl font-heading font-bold text-white">
                      15 000 ₽
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      Стандартная цена
                    </p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-8">
                  Включает: обед, рабочие материалы, сертификат, доступ к
                  закрытому Telegram-чату
                </p>
                <Link
                  href="/tariffs"
                  className="inline-block px-10 py-4 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(0,207,255,0.3)] hover:shadow-[0_0_50px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                >
                  Забронировать место
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
