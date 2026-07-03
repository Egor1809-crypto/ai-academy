"use client";

import ScrollReveal from "./ScrollReveal";

/**
 * Блок «Безопасность данных» — для юристов конфиденциальность клиента и соблюдение
 * 152-ФЗ важнее скорости. Снимаем главное возражение («а не утекут ли данные в
 * иностранный AI?») и превращаем нашу комплаенс-экспертизу в преимущество.
 */
interface Point {
  title: string;
  desc: string;
  icon: string;
}

const POINTS: Point[] = [
  {
    title: "Данные не покидают контур",
    desc: "Учим работать с локальными моделями (Ollama, on-premise) — чувствительные документы не уходят в чужое облако.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Российские AI-сервисы",
    desc: "Приоритет YandexGPT и GigaChat — ПО из реестра, данные хранятся в РФ. Меньше рисков по трансграничной передаче.",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Работа по 152-ФЗ",
    desc: "Обезличивание, согласия, что можно и что нельзя загружать в AI. Соответствие требованиям при обработке ПДн.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Цифровая гигиена",
    desc: "Разбираем на практике, какие данные нельзя вводить в облачные AI и как безопасно обезличивать документы.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
];

export default function DataSecurity() {
  return (
    <section className="py-14 sm:py-20 md:py-28 relative overflow-hidden bg-navy-900">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-0 right-1/4 w-[460px] h-[460px] bg-cyber-purple/[0.05] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 sm:mb-14">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/60" />
              <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                Безопасность данных
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/60" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Тайна клиента — <span className="text-gradient-gold">под контролем</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              AI не должен стоить вам адвокатской тайны. Учим применять нейросети так, чтобы
              чувствительные данные оставались защищёнными.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {POINTS.map((p, i) => (
            <ScrollReveal key={p.title} direction="up" delay={(i % 4) * 80}>
              <div className="relative h-full dossier-card border border-gold/15 rounded-xl p-6 hover:border-gold/35 transition-colors duration-300">
                <span className="hud-corner-tl" />
                <span className="inline-flex w-12 h-12 items-center justify-center rounded-lg bg-gold/10 border border-gold/20 text-gold mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={p.icon} />
                  </svg>
                </span>
                <h3 className="font-heading font-bold text-lg text-white mb-2 leading-tight">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
