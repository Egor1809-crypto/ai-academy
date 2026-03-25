const reviews = [
  {
    text: "До курса тратил на первичный анализ договоров по 2-3 часа. Сейчас загоняю в Claude с правильным промптом, и через 5 минут у меня готовая таблица рисков. Окупил премиум тариф за первую неделю работы.",
    name: "Иван С.",
    role: "Корпоративный юрист",
    letter: "И",
  },
  {
    text: "Боялась, что будет сложно технически. Но объясняют всё на пальцах. Особенно понравился модуль по Legal Design — теперь мои презентации для судов выглядят как из дорогого агентства.",
    name: "Елена М.",
    role: "Адвокат",
    letter: "Е",
  },
  {
    text: "Внедрили AI в работу нашего юр. отдела (12 человек). Скорость обработки входящих претензий выросла в 3 раза. Отдельное спасибо преподавателю за разбор безопасности данных.",
    name: "Алексей Р.",
    role: "Руководитель юр. департамента",
    letter: "А",
  },
  {
    text: "Как арбитражный управляющий, я постоянно анализирую выписки по счетам. Научился использовать ChatGPT для поиска подозрительных транзакций. Экономия времени колоссальная!",
    name: "Дмитрий К.",
    role: "Арбитражный управляющий",
    letter: "Д",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-navy-900 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-64 bg-gold/5 blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">Отзывы выпускников</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((r) => (
            <div key={r.name} className="bg-navy-800 p-6 border border-white/10 relative">
              <svg className="w-8 h-8 text-gold/20 absolute top-4 right-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-sm text-gray-300 mb-6 relative z-10">&ldquo;{r.text}&rdquo;</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-navy-700 rounded-full flex items-center justify-center font-bold text-gold">
                  {r.letter}
                </div>
                <div>
                  <div className="font-bold text-sm">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
