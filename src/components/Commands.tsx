"use client";

import ScrollReveal from "./ScrollReveal";

/**
 * Секция «Готовые команды» — карта болей юриста как интерактивные карточки
 * (адаптация «готовых команд» Яндекс.Нейроюриста под наш продукт). Клик по
 * карточке прокручивает к живому демо (#live-demo) и шлёт событие demo:ask с
 * готовым промптом — посетитель сразу видит результат. Связка «боль → демо».
 *
 * PATTERN(8): InteractiveCard; CONCEPT(8): PainMap; TECH(6): CustomEvent bus.
 */
interface Command {
  title: string;
  desc: string;
  prompt: string;
  icon: string; // path d (Heroicons outline, viewBox 0 0 24 24)
}

const COMMANDS: Command[] = [
  {
    title: "Анализ договора",
    desc: "Риски, кабальные условия, что править",
    prompt:
      "Проанализируй договор поставки: перечисли ключевые риски для покупателя и что стоит изменить.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Ответ на претензию",
    desc: "Структура и аргументы за 2 минуты",
    prompt:
      "Составь структуру ответа на претензию о нарушении сроков поставки с юридическими аргументами.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Судебная практика",
    desc: "Позиции ВС РФ по вашему вопросу",
    prompt:
      "Подбери позицию ВС РФ по взысканию неустойки и её снижению по ст. 333 ГК РФ.",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  },
  {
    title: "Проверка контрагента",
    desc: "Due Diligence чек-лист перед сделкой",
    prompt:
      "Сделай чек-лист due diligence контрагента перед крупной сделкой: что проверить и где.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Составление иска",
    desc: "Каркас искового заявления",
    prompt:
      "Составь структуру искового заявления о взыскании задолженности по договору аренды.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    title: "Правовая позиция",
    desc: "Аргументы за и против по спору",
    prompt:
      "Сформируй правовую позицию по спору о качестве выполненных работ: аргументы обеих сторон.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "Оформление документа",
    desc: "Деловой стиль и чистая структура",
    prompt:
      "Оформи претензию делово и структурно: шапка, суть нарушения, требования, срок ответа.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  },
  {
    title: "Сравнение документов",
    desc: "Ключевые расхождения двух редакций",
    prompt:
      "Сравни две редакции договора и выдели ключевые расхождения в обязательствах сторон.",
    icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
];

function tryCommand(prompt: string) {
  const el = document.getElementById("live-demo");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Небольшая задержка, чтобы демо оказалось в зоне видимости до отправки.
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("demo:ask", { detail: prompt }));
  }, 600);
}

export default function Commands() {
  return (
    <section className="py-14 sm:py-20 md:py-28 relative overflow-hidden bg-navy-800">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute -top-20 left-1/4 w-[420px] h-[420px] bg-gold/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 sm:mb-14">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/60" />
              <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                Готовые команды
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/60" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Рутина юриста — <span className="text-gradient-gold">на автопилоте</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">
              Нажмите на задачу — и увидите результат прямо в живом демо ниже.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMANDS.map((c, i) => (
            <ScrollReveal key={c.title} direction="up" delay={(i % 4) * 80}>
              <button
                onClick={() => tryCommand(c.prompt)}
                className="group relative w-full h-full text-left bg-white/[0.03] border border-white/10 rounded-xl p-5 transition-all duration-300 hover:border-gold/40 hover:bg-white/[0.05] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,207,255,0.1)] cursor-pointer flex flex-col"
              >
                <span className="inline-flex w-11 h-11 items-center justify-center rounded-lg bg-gold/10 border border-gold/20 text-gold mb-4 group-hover:bg-gold/15 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.icon} />
                  </svg>
                </span>
                <h3 className="font-heading font-bold text-lg text-white group-hover:text-gold transition-colors mb-1">
                  {c.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed flex-1">{c.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wide text-gray-400 group-hover:text-gold transition-colors">
                  Попробовать
                  <svg
                    className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
