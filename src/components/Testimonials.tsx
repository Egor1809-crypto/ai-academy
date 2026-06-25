"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const reviews = [
  {
    text: "Первичный анализ договора раньше занимал у меня два-три часа. Сейчас загружаю текст по отработанному на курсе промпту и получаю структурированную таблицу рисков за несколько минут. Финальную проверку всё равно делаю руками — но отталкиваюсь уже от готового разбора, а не от чистого листа.",
    name: "Иван Соколов",
    role: "Корпоративный юрист",
    company: "KELIN Group",
    initials: "ИС",
    metric: "−2,5ч",
    metricLabel: "на анализ договора",
    featured: true,
  },
  {
    text: "Шла на курс с опаской — думала, будет сложно технически. На деле всё разбирают по шагам, без жаргона. Сильнее всего пригодился модуль по Legal Design: процессуальные документы и презентации для суда теперь выглядят аккуратно и читаемо, и для этого не нужен отдельный дизайнер.",
    name: "Елена Маркова",
    role: "Адвокат",
    company: "АБ «Правый берег»",
    initials: "ЕМ",
    metric: "2 нед",
    metricLabel: "до первого результата",
    featured: false,
  },
  {
    text: "Внедрили подход во всём отделе — двенадцать человек. Обработка входящих претензий ускорилась примерно втрое, типовые обращения ушли с юристов на проверенные шаблоны. Отдельно ценно, что на курсе серьёзно разбирают безопасность данных — для нас это было обязательным условием.",
    name: "Алексей Русаков",
    role: "Руководитель юр. департамента",
    company: "ТехноПром",
    initials: "АР",
    metric: "×3",
    metricLabel: "скорость отдела",
    featured: false,
  },
  {
    text: "В банкротстве я постоянно анализирую банковские выписки в поиске сомнительных операций. Настроил под эту задачу связку инструментов с курса — то, на что уходил полный рабочий день, теперь закрываю за пару часов. Освободившееся время трачу на действительно сложные дела.",
    name: "Дмитрий Козлов",
    role: "Арбитражный управляющий",
    company: "Независимая практика",
    initials: "ДК",
    metric: "−5ч",
    metricLabel: "на анализ выписок",
    featured: true,
  },
];

export default function Testimonials() {
  return (
    <section className="py-14 sm:py-20 md:py-36 relative overflow-hidden">
      {/* Dark bg with subtle gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050d1a_0%,#0a1628_50%,#050d1a_100%)]" />
      <SectionParticles id="testimonials-particles" preset="nebula" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gold/[0.03] blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 sm:mb-14 md:mb-20">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
              <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                Результаты
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5">
              Отзывы{" "}
              <span className="text-gold">выпускников</span>
            </h2>
            <p className="text-gray-500">Реальные результаты от реальных юристов</p>
          </div>
        </ScrollReveal>

        {/* Masonry-like 2-col grid — featured cards are taller */}
        <div className="grid md:grid-cols-2 gap-5">
          {reviews.map((r, i) => (
            <ScrollReveal key={r.name} direction={i % 2 === 0 ? "left" : "right"} delay={i * 100}>
              <div
                className={`group relative border transition-all duration-700 overflow-hidden ${
                  r.featured
                    ? "bg-gold/[0.03] border-gold/15 hover:border-gold/40 hover:shadow-[0_0_40px_rgba(0,207,255,0.08)]"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                }`}
              >
                {/* Corner SVGs */}
                <svg className="absolute top-0 left-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
                  <path d="M0 12V1C0 .448.448 0 1 0H12" stroke={r.featured ? "rgba(0,207,255,0.3)" : "rgba(255,255,255,0.08)"} strokeWidth="1.5" />
                </svg>
                <svg className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" viewBox="0 0 24 24" fill="none">
                  <path d="M24 12V23C24 23.552 23.552 24 23 24H12" stroke={r.featured ? "rgba(0,207,255,0.3)" : "rgba(255,255,255,0.08)"} strokeWidth="1.5" />
                </svg>

                <div className="flex flex-col md:flex-row">
                  {/* Metric column */}
                  <div className={`md:w-[140px] shrink-0 p-6 md:p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${
                    r.featured ? "border-gold/10 bg-gold/[0.02]" : "border-white/[0.04]"
                  }`}>
                    <div
                      className="text-4xl md:text-5xl font-heading font-black leading-none"
                      style={{
                        background: r.featured
                          ? "linear-gradient(135deg, #00CFFF, #fff)"
                          : "linear-gradient(135deg, #fff, #666)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {r.metric}
                    </div>
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mt-1.5 leading-tight">
                      {r.metricLabel}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 md:p-8">
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, s) => (
                        <svg key={s} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={r.featured ? "#00CFFF" : "#555"}>
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed mb-6">{r.text}</p>

                    {/* Author */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/[0.05]">
                      <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm shrink-0 ${
                        r.featured
                          ? "bg-gold/10 border border-gold/20 text-gold"
                          : "bg-white/5 border border-white/10 text-gray-400"
                      }`}>
                        {r.initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{r.name}</div>
                        <div className="text-xs text-gray-500">
                          {r.role} · <span className="text-gray-600 font-mono text-[10px]">{r.company}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom accent */}
                {r.featured && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-gold/40 via-gold/20 to-transparent" />
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
