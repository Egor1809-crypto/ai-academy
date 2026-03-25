const cases = [
  { n: "01", title: "Дизайн страниц и презентаций", desc: "Создание убедительных визуальных материалов для судов и клиентов без дизайнера." },
  { n: "02", title: "Посты и видео для продвижения", desc: "Генерация контент-планов, статей и сценариев для развития личного бренда юриста." },
  { n: "03", title: "Аналитические статьи", desc: "Быстрый сбор фактуры и написание экспертных материалов для профильных изданий." },
  { n: "04", title: "Автоматизированный анализ судебной практики", desc: "Поиск прецедентов, суммаризация многостраничных актов за считанные секунды.", highlight: true },
  { n: "05", title: "Разработка судебных документов", desc: "Черновики исков, отзывов, ходатайств по заданным шаблонам с учетом норм права." },
  { n: "06", title: "Анализ договоров", desc: "Выявление рисков, несоответствий и скрытых условий в объемных контрактах." },
  { n: "07", title: "Интерактивное обучение", desc: "Создание тренажеров для младших юристов, симуляция судебных заседаний." },
  { n: "08", title: "Управление проектами", desc: "Декомпозиция задач, планирование ресурсов и сроков по сложным делам." },
  { n: "09", title: "Автоматизация коммуникаций", desc: "Генерация ответов на типовые запросы доверителей, саммари встреч." },
];

const tools = ["CHATGPT", "CLAUDE", "MIDJOURNEY", "GEMINI", "RUNWAY", "SUNO"];

export default function UseCases() {
  return (
    <section className="py-24 bg-tech-grid relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">
          Решайте реальные задачи с AI
        </h2>
        <p className="text-center text-gray-400 mb-16 font-mono text-sm uppercase tracking-widest">
          Практическое применение в работе
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {cases.map((c) => (
            <div key={c.n} className="bg-navy-900 p-8 border border-white/5 group hover:border-gold hover:bg-navy-800 transition-all">
              <div className="text-2xl font-bold text-white/10 group-hover:text-gold/20 mb-4 font-heading">
                {c.n}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${c.highlight ? "text-gold" : ""}`}>
                {c.title}
              </h3>
              <p className="text-gray-400 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {tools.map((t) => (
            <span key={t} className="font-heading font-bold text-2xl tracking-widest">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
