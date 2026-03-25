export default function Bonus() {
  return (
    <section className="py-12 bg-navy-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="border border-gold/30 bg-linear-to-r from-navy-900 to-navy-800 p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 glow-gold">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gold/10 rounded-full blur-[50px]" />
          <div className="relative z-10 flex-1">
            <div className="inline-block bg-gold text-navy-900 font-bold px-3 py-1 text-sm uppercase mb-4">
              Бонус для учеников
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              С каждым курсом — <span className="text-gold">сервисы в подарок</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-xl">
              Бесплатный доступ к премиум AI-сервисам от нашей команды на срок от 3 до 5
              месяцев для отработки навыков на практике.
            </p>
            <div className="flex gap-4 mt-6">
              {["GPT4", "MJ"].map((t) => (
                <div key={t} className="w-12 h-12 bg-navy-900 border border-white/20 flex items-center justify-center rounded-lg">
                  <span className="font-bold text-xs">{t}</span>
                </div>
              ))}
              <div className="w-12 h-12 bg-navy-900 border border-white/20 flex items-center justify-center rounded-lg">
                <span className="font-bold text-xs text-gold">+3</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 bg-navy-900/80 border border-gold/50 p-6 backdrop-blur-sm shrink-0">
            <p className="text-center text-sm uppercase text-gray-400 font-mono mb-4">
              Предложение истекает через:
            </p>
            <div className="flex gap-4 text-center">
              {[
                { val: "05", label: "Дней" },
                { val: "12", label: "Часов" },
                { val: "45", label: "Минут" },
              ].map((t, i) => (
                <div key={t.label} className="flex items-center gap-4">
                  {i > 0 && <div className="text-3xl font-heading text-white/30">:</div>}
                  <div>
                    <div className="text-3xl font-heading font-bold text-white">{t.val}</div>
                    <div className="text-xs text-gold uppercase mt-1">{t.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
