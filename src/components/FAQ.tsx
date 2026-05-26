"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Нужно ли уметь программировать для прохождения курса?",
    a: "Нет, навыки программирования не требуются. Мы учим общаться с нейросетями на естественном языке (составлять промпты) и использовать готовые интерфейсы. Всё объясняем на примерах из юридической практики.",
  },
  {
    q: "Насколько безопасно загружать документы в нейросети?",
    a: "Безопасность — ключевой блок нашего курса. Мы подробно разбираем, как обезличивать данные, какие сервисы не используют ваши запросы для обучения (Enterprise версии) и как соблюдать адвокатскую тайну.",
  },
  {
    q: "Подойдёт ли курс студентам юрфака?",
    a: "Да, курс даст вам огромное конкурентное преимущество при поиске первой работы. Вы сможете выполнять задачи уровня junior+ значительно быстрее своих сверстников.",
  },
  {
    q: "Какие нейросети мы будем изучать?",
    a: "Основной упор на ChatGPT (включая GPT-4), Claude (отличный для анализа больших текстов), а также Midjourney для визуала. Дополнительно рассматриваем отечественные решения (YandexGPT, GigaChat) для работы с гостайной.",
  },
  {
    q: "Будет ли доступ к материалам после окончания?",
    a: "Да, доступ к видеоурокам и базе промптов сохраняется от 6 до 12 месяцев в зависимости от тарифа. База промптов регулярно обновляется.",
  },
  {
    q: "Можно ли оплатить в рассрочку?",
    a: "Да, мы предлагаем рассрочку на 12 месяцев без переплат. Также возможен возврат 13% стоимости через налоговый вычет на образование.",
  },
  {
    q: "Есть ли гарантия возврата?",
    a: "Если в течение первых 7 дней вы поймёте, что курс вам не подходит — мы вернём 100% стоимости без вопросов. Мы уверены в качестве материала.",
  },
  {
    q: "Подойдёт ли курс для корпоративного обучения?",
    a: "Да, мы предлагаем специальные условия для компаний от 5 человек. Включает адаптацию программы под специфику вашей практики и отдельного куратора для команды.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-28 bg-tech-grid relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Частые <span className="text-gold">вопросы</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`border transition-all duration-300 ${
                open === i
                  ? "border-gold/30 bg-white/[0.03]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-lg">{faq.q}</span>
                <span
                  className={`text-gold text-2xl font-light shrink-0 transition-transform duration-300 ${
                    open === i ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div className={`accordion-content px-6 ${open === i ? "open" : ""}`}>
                <p className="pb-5 text-gray-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
