const cards = [
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    text: (
      <>
        Топовые юристы и фирмы вооружаются AI, чтобы быть{" "}
        <span className="text-gold">вне конкуренции</span>
      </>
    ),
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    text: (
      <>
        В кризис критически важно{" "}
        <span className="text-white font-bold">сокращать издержки</span> и экономить время
      </>
    ),
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    text: (
      <>
        Те, кто освоит нейросети сегодня — через год будут{" "}
        <span className="text-gold">задавать правила</span>
      </>
    ),
  },
];

export default function WhyNow() {
  return (
    <section className="py-24 relative bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Профессия юриста <span className="text-gold">меняется прямо сейчас</span>
          </h2>
          <div className="w-20 h-1 bg-gold" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <div key={i} className="relative bg-navy-800 border border-white/10 p-8 group hover:border-gold transition-colors duration-300">
              <div className="hud-corner-tl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="hud-corner-br opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 bg-navy-700 flex items-center justify-center mb-6 text-gold">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {card.icon}
                </svg>
              </div>
              <p className="text-lg font-medium leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
