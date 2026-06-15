"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const cases = [
  { n: "01", title: "Дизайн страниц и презентаций", desc: "Создание убедительных визуальных материалов для судов и клиентов без дизайнера." },
  { n: "02", title: "Посты и видео для продвижения", desc: "Генерация контент-планов, статей и сценариев для развития личного бренда юриста." },
  { n: "03", title: "Аналитические статьи", desc: "Быстрый сбор фактуры и написание экспертных материалов для профильных изданий." },
  { n: "04", title: "Анализ судебной практики", desc: "Поиск прецедентов, суммаризация многостраничных актов за считанные секунды.", highlight: true },
  { n: "05", title: "Разработка судебных документов", desc: "Черновики исков, отзывов, ходатайств по заданным шаблонам с учётом норм права." },
  { n: "06", title: "Анализ договоров", desc: "Выявление рисков, несоответствий и скрытых условий в объёмных контрактах.", highlight: true },
  { n: "07", title: "Интерактивное обучение", desc: "Создание тренажёров для младших юристов, симуляция судебных заседаний." },
  { n: "08", title: "Управление проектами", desc: "Декомпозиция задач, планирование ресурсов и сроков по сложным делам." },
  { n: "09", title: "Автоматизация коммуникаций", desc: "Генерация ответов на типовые запросы доверителей, саммари встреч." },
];

const tools = ["CHATGPT", "CLAUDE", "MIDJOURNEY", "GEMINI", "PERPLEXITY", "RUNWAY"];

export default function UseCases() {
  return (
    <section className="py-14 sm:py-20 md:py-28 bg-tech-grid relative overflow-hidden">
      <SectionParticles id="usecases-particles" preset="orbit" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Решайте <span className="text-gold">реальные задачи</span> с AI
            </h2>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
              Практическое применение в работе
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {cases.map((c, index) => (
            <ScrollReveal key={c.n} direction="up" delay={index * 60}>
              <div
                className={`relative bg-navy-900 p-5 md:p-8 border border-white/5 group transition-all duration-500 ${
                  c.highlight
                    ? "border-l-2 border-l-gold bg-gold/[0.05] hover:shadow-[0_0_20px_rgba(0,207,255,0.1)]"
                    : "hover:border-l-2 hover:border-l-gold hover:shadow-[0_0_20px_rgba(0,207,255,0.08)]"
                }`}
              >
                <div
                  className={`font-heading font-bold text-3xl mb-3 transition-colors duration-500 select-none ${
                    c.highlight
                      ? "text-gold/30 group-hover:text-gold/60"
                      : "text-gold/20 group-hover:text-gold/60"
                  }`}
                >
                  {c.n}
                </div>

                <div className="w-full h-px bg-white/10 mb-4" />

                <h3
                  className={`text-xl font-bold mb-3 ${
                    c.highlight
                      ? "text-gold"
                      : "group-hover:text-gold transition-colors duration-500"
                  }`}
                >
                  {c.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{c.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="fade" delay={200}>
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-center text-xs text-gray-500 font-mono uppercase tracking-widest mb-6">
              Инструменты, которые вы освоите
            </p>
            <div className="flex flex-wrap justify-center items-center gap-5 md:p-8 md:gap-16">
              {tools.map((t) => (
                <span
                  key={t}
                  className="font-heading font-bold text-xl md:text-2xl tracking-widest text-white/20 hover:text-gold/60 transition-colors duration-500 cursor-default"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
