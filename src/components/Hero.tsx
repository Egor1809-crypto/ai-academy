export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 min-h-[90vh] flex items-center bg-tech-grid overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-linear-to-l from-cyber-purple/10 to-transparent pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10 grid lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
        <div className="relative">
          <div className="absolute -top-10 -left-6 w-24 h-24 border-t border-l border-white/10 opacity-50" />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-navy-800 border border-white/10 text-xs font-mono text-gray-400 mb-6 uppercase">
            <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            Набор открыт до 1 мая
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Нейросети для юристов:
            <br />
            <span className="text-gradient-gold">работайте быстрее конкурентов</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl font-light leading-relaxed">
            Промпты, разработанные специально для юридической практики — от дизайна до
            узкоспециализированных документов.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <a
              href="#tariffs"
              className="relative group px-8 py-4 bg-linear-to-r from-cyber-purple to-gold text-white font-heading font-bold uppercase tracking-widest text-lg overflow-hidden glow-purple"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                Получить доступ
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </a>
            <p className="text-sm text-gray-400 font-mono">
              Старт потока:
              <br />
              <span className="text-white font-bold">15 Мая 2024</span>
            </p>
          </div>
        </div>

        <div className="translate-x-8">
          <img
            src="/hero.png"
            alt="AI Legal"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
