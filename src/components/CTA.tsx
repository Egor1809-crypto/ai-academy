export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-navy-900 to-black z-0" />
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <div className="inline-block p-1 bg-linear-to-r from-gold to-cyber-purple mb-8">
          <div className="bg-navy-900 px-6 py-2">
            <span className="font-heading font-bold uppercase tracking-widest text-sm text-gold">
              Спецпредложение
            </span>
          </div>
        </div>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
          Начните применять AI
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-gold to-white">
            уже на этой неделе
          </span>
        </h2>
        <div className="bg-white/5 border border-white/10 p-8 backdrop-blur-sm mb-12 max-w-3xl mx-auto">
          <p className="text-lg md:text-xl font-medium mb-4">
            После сдачи квалификации —{" "}
            <span className="text-gold font-bold">в подарок сайт для юриста</span> стоимостью 88 000 ₽
          </p>
          <p className="text-gray-300">
            + специальные условия партнёрской программы от команды арбитражных управляющих.
          </p>
        </div>
        <a
          href="#tariffs"
          className="inline-block relative group px-12 py-6 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest text-xl hover:bg-gold-light transition-all duration-300 shadow-[0_0_40px_rgba(0,207,255,0.5)] hover:shadow-[0_0_60px_rgba(0,207,255,0.8)] transform hover:-translate-y-1"
        >
          Начать обучение
          <div className="absolute inset-0 border-2 border-white/30 scale-105 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
        </a>
        <p className="mt-6 text-sm text-gray-500 font-mono uppercase">
          Осталось 12 мест на ближайший поток
        </p>
      </div>
    </section>
  );
}
