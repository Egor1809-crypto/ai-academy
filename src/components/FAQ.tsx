"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Нужно ли уметь программировать для прохождения курса?",
    a: "Нет, навыки программирования не требуются. Мы учим общаться с нейросетями на естественном языке (составлять промпты) и использовать готовые интерфейсы.",
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
    a: "Основной упор на ChatGPT (включая GPT-4), Claude 3 (отличный для анализа больших текстов), а также Midjourney для визуала. Дополнительно рассматриваем отечественные решения (YandexGPT, GigaChat) для работы с гостайной.",
  },
  {
    q: "Будет ли доступ к материалам после окончания?",
    a: "Да, доступ к видеоурокам и базе промптов сохраняется от 6 до 12 месяцев в зависимости от выбранного тарифа. База промптов регулярно обновляется.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 bg-tech-grid border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/10">
              <button
                className="w-full py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-lg">{faq.q}</span>
                <span className="text-gold text-2xl font-light">{open === i ? "−" : "+"}</span>
              </button>
              <div className={`accordion-content ${open === i ? "open" : ""}`}>
                <p className="pb-5 text-gray-400 text-sm">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
