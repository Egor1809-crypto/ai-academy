"use client";

import { useState } from "react";

const modules = [
  {
    title: "Введение в нейросети для юристов",
    items: [
      "Что такое LLM и как они работают (просто о сложном)",
      "Обзор основных инструментов: ChatGPT, Claude, GigaChat, YandexGPT",
      "Безопасность данных и адвокатская тайна при работе с AI",
      "Базовые принципы составления эффективных промптов (Prompt Engineering)",
    ],
  },
  {
    title: "AI в судебно-претензионной работе",
    items: [
      "Анализ судебной практики: поиск скрытых закономерностей",
      "Генерация черновиков исковых заявлений и отзывов",
      "Подготовка правовых позиций на основе загруженных документов",
      "Суммаризация многотомных дел",
    ],
  },
  {
    title: "Договорная работа и комплаенс",
    items: [
      "Автоматизированная проверка контрагентов",
      "Поиск рисков и несоответствий в договорах (Due Diligence)",
      "Генерация типовых договоров и дополнительных соглашений",
      "Сравнение версий документов и выявление изменений",
    ],
  },
  {
    title: "Маркетинг и визуал для юриста",
    items: [
      "Создание контент-плана для соцсетей (Telegram, VK)",
      "Генерация постов, статей и кейсов",
      "Midjourney: создание обложек для статей и презентаций без дизайнера",
      "Основы Legal Design с помощью нейросетей",
    ],
  },
];

export default function Program() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="program" className="py-24 bg-navy-900 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">Программа курса</h2>
        <div className="space-y-4">
          {modules.map((m, i) => (
            <div key={i} className="border border-white/10 bg-navy-800 overflow-hidden">
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-heading font-bold text-lg">
                  <span className="text-gold mr-4">Модуль {i + 1}.</span>
                  {m.title}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`accordion-content px-6 bg-navy-900/50 ${open === i ? "open" : ""}`}>
                <div className="pb-5 pt-2 text-gray-300 text-sm">
                  <ul className="list-disc pl-5 space-y-2">
                    {m.items.map((item, j) => (
                      <li key={j}>{item}</li>
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
