const items = [
  {
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "Практикующий юрист",
    desc: "Автоматизация рутины, ускорение составления типовых документов на 70%.",
  },
  {
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    title: "Адвокат",
    desc: "Быстрый анализ судебной практики и формирование правовой позиции.",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Руководитель юр. отдела",
    desc: "Оптимизация работы команды, контроль качества документов, управление проектами.",
  },
  {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Арбитражный управляющий",
    desc: "Обработка больших объемов данных, анализ финансового состояния, подготовка отчетов.",
  },
];

export default function Audience() {
  return (
    <section id="about" className="py-20 bg-navy-800 border-y border-white/5 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl md:text-4xl font-bold mb-12 text-center">
          Кому необходим этот курс
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-6 bg-navy-900 border border-white/5 hover:bg-navy-700 transition-colors">
              <svg className="w-8 h-8 text-cyber-purple mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <h3 className="font-heading font-bold text-lg mb-2 text-gold">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
