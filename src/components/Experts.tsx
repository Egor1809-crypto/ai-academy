const experts = [
  { name: "Олег Пащенко", desc: "LegalTech специалист, внедрение AI в корпоративные процессы." },
  { name: "Владислав Галкин", desc: "Специалист по нейросетям для дизайна и создания визуального контента юриста." },
  { name: "Дмитрий Сизов", desc: "Управляющий партнер, эксперт по автоматизации судебно-претензионной работы." },
  { name: "Василий Артин", desc: "Промпт-инженер, разработчик специализированных решений для анализа договоров." },
];

export default function Experts() {
  return (
    <section id="experts" className="py-24 bg-navy-900 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold mb-16">
          Эксперты-<span className="text-gold">практики</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {experts.map((e) => (
            <div key={e.name} className="group cursor-pointer">
              <div className="relative w-full aspect-[4/5] bg-navy-800 border border-white/10 mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-gold/20 mix-blend-overlay group-hover:opacity-0 transition-opacity z-10" />
                <div className="w-full h-full bg-navy-700 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-500">
                  <svg className="w-20 h-20 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-navy-900 to-transparent z-20" />
                <div className="absolute bottom-4 left-4 z-30">
                  <div className="w-8 h-1 bg-gold mb-2 transform origin-left group-hover:scale-x-150 transition-transform" />
                  <h3 className="font-heading font-bold text-2xl uppercase">{e.name}</h3>
                </div>
              </div>
              <p className="text-sm text-gray-400">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
