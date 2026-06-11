"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

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
        {/* ── Шапка «дела» ── */}
        <ScrollReveal direction="up">
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="dossier-margin">Дело № AI&middot;2026</span>
              <span className="h-px flex-1 bg-white/10" />
              <span className="dossier-margin">Учебная программа</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif-display text-4xl md:text-6xl font-semibold leading-[1.05] text-white">
                Программа{" "}
                <span className="italic dossier-marker text-white">курса</span>
              </h2>
              <span className="dossier-stamp text-gold text-xs mb-2">8 недель</span>
            </div>

            <p className="dossier-margin mt-4 normal-case tracking-normal text-[0.8rem]">
              4 модуля &nbsp;·&nbsp; 40+ практических заданий &nbsp;·&nbsp; разбор кейсов
            </p>
          </div>
        </ScrollReveal>

        {/* ── Подшивка модулей ── */}
        <div className="space-y-4">
          {modules.map((m, i) => {
            const isOpen = open === i;
            return (
              <ScrollReveal key={i} direction="up" delay={i * 80}>
                <div
                  className={`group dossier-card relative border transition-all duration-300 ${
                    isOpen
                      ? "dossier-open border-gold/40"
                      : "border-white/10 hover:border-gold/30"
                  }`}
                >
                  {/* Вертикальная «вкладка-корешок» дела слева */}
                  <span
                    className={`absolute left-0 top-0 h-full w-[3px] transition-colors duration-300 ${
                      isOpen ? "bg-gold" : "bg-white/10 group-hover:bg-gold/50"
                    }`}
                  />

                  <button
                    className="w-full px-6 sm:px-8 py-6 flex items-start sm:items-center justify-between gap-4 text-left focus:outline-none cursor-pointer"
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <div className="flex items-start sm:items-center gap-5 min-w-0">
                      {/* Параграф-индекс */}
                      <span className="font-serif-display italic text-3xl sm:text-4xl text-gold/30 shrink-0 select-none leading-none mt-1 sm:mt-0">
                        §{String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0">
                        <span className="dossier-stamp text-gold/70 text-[0.6rem] mb-2 sm:mb-0">
                          Модуль {i + 1}
                        </span>
                        <h3 className="font-serif-display text-xl sm:text-2xl text-white font-medium mt-3 leading-snug">
                          {m.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="dossier-stamp dossier-stamp--alt hidden sm:inline-block text-gray-400 text-[0.6rem]">
                        {m.duration}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gold transform transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  <div className={`accordion-content px-6 sm:px-8 ${isOpen ? "open" : ""}`}>
                    <div className="pb-7 pt-1 sm:pl-[4.5rem]">
                      {/* Приложенные инструменты */}
                      <div className="flex items-center flex-wrap gap-2 mb-5">
                        <span className="dossier-margin mr-1">Инструменты:</span>
                        {m.tools.map((tool) => (
                          <span
                            key={tool}
                            className="px-2.5 py-1 border border-gold/25 text-gold/90 text-[0.65rem] font-mono uppercase tracking-wider"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>

                      {/* Пункты дела — с моно-нумерацией на полях */}
                      <ul className="space-y-3.5">
                        {m.items.map((item, j) => (
                          <li key={j} className="flex items-baseline gap-4 text-gray-300 text-[0.95rem] leading-relaxed">
                            <span className="dossier-margin shrink-0 text-gold/50 w-7">
                              {String(j + 1).padStart(2, "0")}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
