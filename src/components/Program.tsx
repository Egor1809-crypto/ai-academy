"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/Program.tsx — VERSION 2.0.0
// Редизайн editorial+циан. Реальные 8 уроков БФЛ (из кампании), логика «как работает →
// потребности → практика → платформы → агенты». Урок 6 «Практикум: банкротство» —
// дифференциатор (подсвечен, открыт по умолчанию). Убраны gold и dossier-тема.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const LESSONS = [
  {
    title: "Новый Мир",
    tariff: "Лид-магнит",
    tags: ["LLM", "доступ из РФ"],
    items: [
      "Физика LLM: как модель «думает» и почему галлюцинирует",
      "Доктрина моделей: какая под какую задачу (Claude-first)",
      "Среды и интерфейсы работы с ИИ",
      "Экономика доступа из РФ: оплата, VPN, лимиты",
    ],
  },
  {
    title: "Язык Машины",
    tariff: "Старт",
    tags: ["промптинг", "GRACE"],
    items: [
      "Структура промпта, которая реально работает",
      "XML-якоря для точности и предсказуемости вывода",
      "Авторская методология GRACE",
      "Подготовка данных под запрос",
    ],
  },
  {
    title: "Инструментарий",
    tariff: "Старт",
    tags: ["инструменты", "Windows"],
    items: [
      "Уровни инструментов: от чата до агентов",
      "Где экономия реальна, а где — иллюзия",
      "Доступы из РФ и Windows-версия (без «только Mac»)",
    ],
  },
  {
    title: "Российский стек",
    tariff: "Старт / Практик",
    tags: ["Консультант", "Гарант", "GigaChat"],
    items: [
      "Консультант ИИ, Гарант ИСКРА",
      "Нейроюрист, GigaChat",
      "Casebook / XSUD для банкротных дел",
      "Когда РФ-обёртка вместо фронтира — и наоборот",
    ],
  },
  {
    title: "Безопасность и этика",
    tariff: "Практик",
    tags: ["152-ФЗ", "тайна"],
    items: [
      "Адвокатская тайна и позиции ФПА",
      "Работа по 152-ФЗ, обезличивание ПДн",
      "Локальные модели для чувствительных данных",
      "Проверка галлюцинаций перед подачей в суд",
    ],
  },
  {
    title: "Практикум: банкротство",
    tariff: "Практик",
    differentiator: true,
    tags: ["реестр", "оспаривание 61.2", "Федресурс"],
    items: [
      "Реестр требований кредиторов — за минуты, а не за вечер",
      "Отзывы и возражения на требования",
      "Жалобы, ходатайства, заявления",
      "Анализ сделок должника: оспаривание по ст. 61.2–61.9",
      "Мониторинг сроков через Федресурс и КАД",
    ],
  },
  {
    title: "Практикум: судебка и договоры",
    tariff: "Практик",
    tags: ["процессуалка", "практика"],
    items: [
      "Процессуальные документы под конкретное дело",
      "Анализ судебной практики и формирование позиции",
      "Разбор реальных дел слушателей",
    ],
  },
  {
    title: "Агенты и автоматизация",
    tariff: "Внедрение",
    tags: ["MCP", "RAG", "боты"],
    items: [
      "MCP и сборка агентов под свои задачи",
      "Парсер КАД и Telegram-бот под рутину",
      "RAG-база по вашим делам",
      "Автоматизация конвейера БФЛ",
    ],
  },
];

export default function Program() {
  const [open, setOpen] = useState<number | null>(5); // по умолчанию открыт дифференциатор (Урок 6)

  return (
    <section id="program" className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute top-1/3 left-0 w-[440px] h-[440px] bg-cyber-blue/[0.04] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* ── Header ── */}
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-16">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">программа · 8 уроков</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="font-serif-display italic block text-[#e6e6e6]/50 mb-2" style={{ fontSize: "clamp(20px, 2.8vw, 38px)" }}>
                восемь уроков —
              </span>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(36px, 5.6vw, 82px)" }}>
                от физики LLM
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(38px, 5.8vw, 84px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                до своего конвейера
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Как работает → базовые потребности → практика БФЛ → российские платформы → свои ИИ-агенты. Урок 6 — практикум по банкротству, которого нет ни у кого.
            </p>
          </div>
        </ScrollReveal>

        {/* ── Уроки-аккордеон ── */}
        <div className="space-y-3">
          {LESSONS.map((m, i) => {
            const isOpen = open === i;
            const diff = m.differentiator;
            return (
              <ScrollReveal key={i} direction="up" delay={i * 50}>
                <div
                  className={`group relative rounded-2xl border transition-all duration-300 ${
                    diff
                      ? isOpen
                        ? "border-cyber-blue/60 bg-cyber-blue/[0.05]"
                        : "border-cyber-blue/35 bg-cyber-blue/[0.03] hover:border-cyber-blue/60"
                      : isOpen
                        ? "border-cyber-blue/40 bg-white/[0.02]"
                        : "border-white/10 hover:border-cyber-blue/30"
                  }`}
                >
                  <button
                    className="w-full px-5 sm:px-7 py-5 flex items-center justify-between gap-4 text-left focus:outline-none cursor-pointer"
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <span
                        className={`font-black shrink-0 select-none leading-none tabular-nums ${diff ? "text-cyber-blue/60" : "text-white/[0.12] group-hover:text-cyber-blue/40"} transition-colors`}
                        style={{ fontFamily: HELV, fontSize: "clamp(30px, 3.4vw, 46px)", letterSpacing: "-0.03em" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <span className={`font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border ${diff ? "text-cyber-blue border-cyber-blue/40 bg-cyber-blue/[0.08]" : "text-[#e6e6e6]/45 border-white/10"}`}>
                            {m.tariff}
                          </span>
                          {diff && (
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-navy-900 bg-cyber-blue px-2 py-0.5 rounded font-bold">
                              ★ дифференциатор
                            </span>
                          )}
                        </div>
                        <h3
                          className={diff ? "text-cyber-blue" : "text-white"}
                          style={{ fontFamily: HELV, fontWeight: 700, fontSize: "clamp(18px, 2vw, 24px)", letterSpacing: "-0.01em", textTransform: "none", lineHeight: 1.15 }}
                        >
                          {m.title}
                        </h3>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 shrink-0 transform transition-transform duration-300 ${isOpen ? "rotate-90" : ""} ${diff ? "text-cyber-blue" : "text-cyber-blue/70"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className={`accordion-content px-5 sm:px-7 ${isOpen ? "open" : ""}`}>
                    <div className="pb-6 pt-1 sm:pl-[4.7rem]">
                      <ul className="space-y-3 mb-5">
                        {m.items.map((item, j) => (
                          <li key={j} className="flex items-baseline gap-4 text-[#e6e6e6]/70 text-[15px] leading-relaxed">
                            <span className="font-mono shrink-0 text-cyber-blue/50 w-6 text-[12px]">{String(j + 1).padStart(2, "0")}</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center flex-wrap gap-2">
                        {m.tags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded border border-cyber-blue/20 text-cyber-blue/80 text-[0.65rem] font-mono lowercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
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
