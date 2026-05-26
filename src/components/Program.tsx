"use client";

import { useState } from "react";

const modules = [
  {
    title: "Введение в нейросети для юристов",
    duration: "2 недели",
    tools: ["ChatGPT", "Claude", "YandexGPT"],
    items: [
      "Что такое LLM и как они работают (просто о сложном)",
      "Обзор основных инструментов: ChatGPT, Claude, GigaChat, YandexGPT",
      "Безопасность данных и адвокатская тайна при работе с AI",
      "Базовые принципы Prompt Engineering для юристов",
    ],
  },
  {
    title: "AI в судебно-претензионной работе",
    duration: "2 недели",
    tools: ["ChatGPT", "Claude", "Perplexity"],
    items: [
      "Анализ судебной практики: поиск скрытых закономерностей",
      "Генерация черновиков исковых заявлений и отзывов",
      "Подготовка правовых позиций на основе загруженных документов",
      "Суммаризация многотомных дел за минуты",
    ],
  },
  {
    title: "Договорная работа и комплаенс",
    duration: "2 недели",
    tools: ["ChatGPT", "Claude", "Gemini"],
    items: [
      "Автоматизированная проверка контрагентов",
      "Поиск рисков и несоответствий в договорах (Due Diligence)",
      "Генерация типовых договоров и дополнительных соглашений",
      "Сравнение версий документов и выявление изменений",
    ],
  },
  {
    title: "Маркетинг и визуал для юриста",
    duration: "2 недели",
    tools: ["Midjourney", "Runway", "Suno"],
    items: [
      "Создание контент-плана для соцсетей (Telegram, VK)",
      "Генерация постов, статей и кейсов с помощью AI",
      "Midjourney: обложки для статей и презентаций без дизайнера",
      "Основы Legal Design с помощью нейросетей",
    ],
  },
];

export default function Program() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="program" className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Программа <span className="text-gold">курса</span>
          </h2>
          <p className="text-gray-400">
            4 модуля &middot; 8 недель &middot; 40+ практических заданий
          </p>
        </div>

        <div className="space-y-3">
          {modules.map((m, i) => (
            <div
              key={i}
              className={`border overflow-hidden transition-all duration-300 ${
                open === i
                  ? "border-gold/30 bg-white/[0.03]"
                  : "border-white/10 bg-navy-800 hover:border-white/20"
              }`}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gold font-heading font-bold text-lg shrink-0 w-20">
                    Модуль {i + 1}
                  </span>
                  <span className="font-heading font-bold text-lg">{m.title}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="hidden sm:block text-xs text-gray-500 font-mono">{m.duration}</span>
                  <svg
                    className={`w-5 h-5 text-gold transform transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <div className={`accordion-content px-6 ${open === i ? "open" : ""}`}>
                <div className="pb-6 pt-2">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {m.tools.map((tool) => (
                      <span
                        key={tool}
                        className="px-3 py-1 bg-gold/10 border border-gold/20 text-gold text-xs font-mono uppercase"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-3">
                    {m.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3 text-gray-300 text-sm">
                        <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
      </div>
    </section>
  );
}
