"use client";

import ScrollReveal from "./ScrollReveal";

const reviews = [
  {
    text: "До курса тратил на первичный анализ договоров по 2-3 часа. Сейчас загоняю в Claude с правильным промптом, и через 5 минут у меня готовая таблица рисков. Окупил премиум тариф за первую неделю работы.",
    name: "Иван Соколов",
    role: "Корпоративный юрист",
    company: "KELIN Group",
    initials: "ИС",
    metric: "В 36 раз быстрее",
  },
  {
    text: "Боялась, что будет сложно технически. Но объясняют всё на пальцах. Особенно понравился модуль по Legal Design — теперь мои презентации для судов выглядят как из дорогого агентства.",
    name: "Елена Маркова",
    role: "Адвокат",
    company: "Адвокатское бюро «Правый берег»",
    initials: "ЕМ",
    metric: "Legal Design за 2 недели",
  },
  {
    text: "Внедрили AI в работу нашего юр. отдела (12 человек). Скорость обработки входящих претензий выросла в 3 раза. Отдельное спасибо за разбор безопасности данных.",
    name: "Алексей Русаков",
    role: "Руководитель юр. департамента",
    company: "ТехноПром",
    initials: "АР",
    metric: "Продуктивность x3",
  },
  {
    text: "Как арбитражный управляющий, я постоянно анализирую выписки по счетам. Научился использовать ChatGPT для поиска подозрительных транзакций. Экономия времени колоссальная!",
    name: "Дмитрий Козлов",
    role: "Арбитражный управляющий",
    company: "Независимая практика",
    initials: "ДК",
    metric: "40 часов/мес экономии",
  },
];

function StarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="#00CFFF">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function CornerDecorations() {
  return (
    <>
      {/* Top-left */}
      <svg className="absolute top-0 left-0 w-4 h-4 text-[#00CFFF]/30" viewBox="0 0 16 16" fill="none">
        <path d="M0 16V0h16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {/* Top-right */}
      <svg className="absolute top-0 right-0 w-4 h-4 text-[#00CFFF]/30" viewBox="0 0 16 16" fill="none">
        <path d="M16 16V0H0" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {/* Bottom-left */}
      <svg className="absolute bottom-0 left-0 w-4 h-4 text-[#00CFFF]/30" viewBox="0 0 16 16" fill="none">
        <path d="M0 0v16h16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {/* Bottom-right */}
      <svg className="absolute bottom-0 right-0 w-4 h-4 text-[#00CFFF]/30" viewBox="0 0 16 16" fill="none">
        <path d="M16 0v16H0" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );
}

export default function Testimonials() {
  return (
    <section className="py-28 bg-[#050d1a] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-64 bg-[#00CFFF]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Отзывы <span className="text-[#00CFFF]">выпускников</span>
            </h2>
            <p className="text-gray-400">Реальные результаты от реальных юристов</p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((r, i) => (
            <ScrollReveal key={r.name} direction="up" delay={i * 120}>
              <div className="bg-white/[0.03] backdrop-blur-sm p-6 border border-white/10 relative group hover:border-[#00CFFF]/20 hover:shadow-[0_0_20px_rgba(0,207,255,0.1)] transition-all duration-500 flex flex-col h-full">
                <CornerDecorations />

                {/* Quote decoration */}
                <span className="absolute top-3 right-4 text-6xl leading-none text-[#00CFFF]/10 font-serif pointer-events-none select-none">
                  &ldquo;
                </span>

                {/* Metric pill with gradient border */}
                <div className="inline-block self-start mb-4 relative p-px rounded-full bg-gradient-to-r from-[#00CFFF] to-[#FF007A]">
                  <div className="bg-[#050d1a] px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-[#00CFFF] uppercase">
                      {r.metric}
                    </span>
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex gap-0.5 mb-3">
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                </div>

                <p className="text-sm text-gray-300 mb-6 flex-1 leading-relaxed">{r.text}</p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 bg-[#0a1628] flex items-center justify-center font-bold text-[#00CFFF] text-sm shrink-0 border border-[#00CFFF]/20">
                    {r.initials}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.role}</div>
                    <div className="text-[10px] text-[#00CFFF]/60 font-mono">{r.company}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
