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

export default function Testimonials() {
  return (
    <section className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-64 bg-gold/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Отзывы <span className="text-gold">выпускников</span>
          </h2>
          <p className="text-gray-400">Реальные результаты от реальных юристов</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((r) => (
            <div key={r.name} className="bg-white/[0.03] backdrop-blur-sm p-6 border border-white/10 relative group hover:border-gold/20 transition-all duration-500 flex flex-col">
              <div className="inline-block bg-gold/10 border border-gold/20 px-3 py-1 text-xs font-bold text-gold uppercase mb-4 self-start">
                {r.metric}
              </div>

              <svg className="w-6 h-6 text-gold/20 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <p className="text-sm text-gray-300 mb-6 flex-1 leading-relaxed">{r.text}</p>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 bg-navy-700 flex items-center justify-center font-bold text-gold text-sm shrink-0">
                  {r.initials}
                </div>
                <div>
                  <div className="font-bold text-sm">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.role}</div>
                  <div className="text-[10px] text-gold/60 font-mono">{r.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
