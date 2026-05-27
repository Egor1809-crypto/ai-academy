"use client";

import CountdownTimer from "./CountdownTimer";
import ScrollReveal from "./ScrollReveal";

const tools = [
  { name: "ChatGPT-4", desc: "Полный доступ", n: "01" },
  { name: "Claude Pro", desc: "Анализ документов", n: "02" },
  { name: "Midjourney", desc: "Визуальный контент", n: "03" },
  { name: "Perplexity", desc: "Исследования", n: "04" },
  { name: "Gemini", desc: "Мультимодальный AI", n: "05" },
];

export default function Bonus() {
  return (
    <section className="py-16 bg-navy-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal direction="up">
        <div className="border border-gold/20 bg-white/[0.02] backdrop-blur-sm p-8 md:p-12 relative overflow-hidden">
          <svg className="absolute top-0 left-0 w-8 h-8 text-gold/50" viewBox="0 0 32 32" fill="none">
            <path d="M0 12 L0 0 L12 0" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-8 h-8 text-gold/50" viewBox="0 0 32 32" fill="none">
            <path d="M32 20 L32 32 L20 32" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg className="absolute top-0 right-0 w-8 h-8 text-gold/50" viewBox="0 0 32 32" fill="none">
            <path d="M20 0 L32 0 L32 12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-8 h-8 text-gold/50" viewBox="0 0 32 32" fill="none">
            <path d="M12 32 L0 32 L0 20" stroke="currentColor" strokeWidth="1.5" />
          </svg>

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
                  <div
                    key={t.name}
                    className="group relative px-4 py-2.5 bg-navy-900 border border-white/10 hover:border-gold/30 hover:shadow-[0_0_15px_rgba(0,207,255,0.1)] transition-all duration-300"
                  >
                    <span className="absolute top-1 right-2 text-[9px] font-mono text-gray-600 group-hover:text-gold/40 transition-colors">
                      {t.n}
                    </span>
                    <span className="font-bold text-sm block">{t.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative bg-navy-900/80 border border-gold/20 p-6 backdrop-blur-sm shrink-0">
              <svg className="absolute top-0 left-0 w-5 h-5 text-gold/40" viewBox="0 0 20 20" fill="none">
                <path d="M0 8 L0 0 L8 0" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <svg className="absolute bottom-0 right-0 w-5 h-5 text-gold/40" viewBox="0 0 20 20" fill="none">
                <path d="M20 12 L20 20 L12 20" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <p className="text-center text-xs uppercase text-gray-500 font-mono mb-4 tracking-widest">
                Предложение истекает
              </p>
              <CountdownTimer targetDate="2025-07-15T00:00:00" />
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
