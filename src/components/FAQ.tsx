"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/FAQ.tsx — VERSION 2.0.0
// Editorial+циан, вопросы под БФЛ (убран Midjourney, «студентам юрфака», гостайна).
// Используется на /tariffs и /program.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const faqs = [
  {
    q: "Нужно ли уметь программировать?",
    a: "Нет. Учим ставить задачи нейросети на естественном языке. Даже Урок 8 про агентов — без кода, на no-code и готовых интерфейсах.",
  },
  {
    q: "Насколько безопасно загружать документы должника?",
    a: "Безопасность — отдельный урок. Разбираем 152-ФЗ, обезличивание, локальные модели и проверку галлюцинаций — чтобы не нарушить тайну и не подать в суд выдуманную практику.",
  },
  {
    q: "Подойдёт, если я только начинаю в банкротстве?",
    a: "Да. Идём от «как это работает» до готового ИИ-конвейера. Практикум (Урок 6) даёт сквозной сценарий дела — от первички до реестра требований.",
  },
  {
    q: "Какие нейросети изучаем?",
    a: "Claude-first: Claude, GPT, Gemini, Perplexity, NotebookLM. Плюс российский стек (YandexGPT, GigaChat, Гарант ИСКРА, Нейроюрист) для чувствительных данных.",
  },
  {
    q: "Будет ли доступ к материалам после?",
    a: "Да, видеоуроки и библиотека шаблонов БФЛ — от 6 месяцев, с обновлениями. Библиотека регулярно пополняется.",
  },
  {
    q: "Можно ли оплатить в рассрочку?",
    a: "Да, рассрочка на 12 месяцев без переплат. По тарифам «Практик» и «Внедрение» — возврат 13% стоимости через налоговый вычет.",
  },
  {
    q: "Есть ли гарантия возврата?",
    a: "Если в первые 7 дней поймёте, что курс не подходит — вернём 100% стоимости без вопросов.",
  },
  {
    q: "Подойдёт для команды / юрфирмы?",
    a: "Да, от 3 человек — адаптация под вашу практику, отдельный куратор команды и регламент использования ИИ в фирме.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-16">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">частые вопросы</p>
            <h2 style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(36px, 5.4vw, 76px)" }}>что чаще всего </span>
              <span className="text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(36px, 5.4vw, 76px)", textShadow: "0 0 50px rgba(0,207,255,0.35)" }}>спрашивают</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 40}>
              <div className={`rounded-2xl border transition-all duration-300 ${open === i ? "border-cyber-blue/40 bg-cyber-blue/[0.03]" : "border-white/10 hover:border-cyber-blue/25"}`}>
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer gap-4"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="text-white text-[17px] md:text-lg" style={{ fontFamily: HELV, fontWeight: 600 }}>{faq.q}</span>
                  <span className={`text-cyber-blue text-2xl font-light shrink-0 transition-transform duration-300 ${open === i ? "rotate-45" : ""}`}>+</span>
                </button>
                <div className={`accordion-content px-6 ${open === i ? "open" : ""}`}>
                  <p className="pb-5 text-[#e6e6e6]/60 text-[15px] leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
