"use client";

import CountdownTimer from "./CountdownTimer";

const tools = [
  { name: "ChatGPT-4", desc: "Полный доступ" },
  { name: "Claude Pro", desc: "Анализ документов" },
  { name: "Midjourney", desc: "Визуальный контент" },
  { name: "Perplexity", desc: "Исследования" },
  { name: "Gemini", desc: "Мультимодальный AI" },
];

export default function Bonus() {
  return (
    <section className="py-16 bg-navy-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="border border-gold/20 bg-white/[0.02] backdrop-blur-sm p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-gold/5 rounded-full blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyber-purple/5 rounded-full blur-[80px]" />

          <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <div className="inline-block bg-gold text-navy-900 font-bold px-3 py-1 text-xs uppercase mb-6 tracking-wider">
                Бонус для учеников
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                AI-сервисы <span className="text-gold">в подарок</span>
              </h2>
              <p className="text-gray-300 mb-6 max-w-xl">
                Бесплатный доступ к премиум AI-сервисам на срок от 3 до 6 месяцев
                для отработки навыков на реальных задачах.
              </p>

              <div className="flex flex-wrap gap-3">
                {tools.map((t) => (
                  <div key={t.name} className="px-4 py-2.5 bg-navy-900 border border-white/10 hover:border-gold/30 transition-colors">
                    <span className="font-bold text-sm block">{t.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-900/80 border border-gold/20 p-6 backdrop-blur-sm shrink-0">
              <p className="text-center text-xs uppercase text-gray-500 font-mono mb-4 tracking-widest">
                Предложение истекает
              </p>
              <CountdownTimer targetDate="2025-07-15T00:00:00" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
