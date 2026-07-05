"use client";

import CountdownTimer from "./CountdownTimer";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/Bonus.tsx — VERSION 2.0.0
// Редизайн editorial+циан: убраны gold и HUD-уголки. Набор сервисов — Claude-first
// (убран Midjourney как нерелевантный БФЛ). Оффер и таймер сохранены.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const tools = [
  { name: "Claude Pro", desc: "Анализ документов", n: "01" },
  { name: "ChatGPT Plus", desc: "Черновики и логика", n: "02" },
  { name: "Gemini", desc: "Большие объёмы", n: "03" },
  { name: "Perplexity", desc: "Поиск практики", n: "04" },
  { name: "NotebookLM", desc: "Анализ без галлюцинаций", n: "05" },
];

export default function Bonus() {
  return (
    <section className="py-16 bg-navy-800 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal direction="up">
          <div className="border border-cyber-blue/20 bg-white/[0.02] backdrop-blur-sm rounded-2xl p-6 md:p-12 relative overflow-hidden">
            <div aria-hidden className="absolute -right-20 -top-20 w-64 h-64 bg-cyber-blue/[0.07] rounded-full blur-[80px]" />
            <div aria-hidden className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyber-blue/[0.04] rounded-full blur-[80px]" />

            <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <div className="inline-block bg-cyber-blue text-navy-900 font-bold px-3 py-1 text-xs uppercase mb-6 tracking-wider rounded">
                  Бонус для учеников
                </div>
                <h2 className="mb-4" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
                  <span className="text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(30px, 4.4vw, 56px)" }}>
                    ИИ-набор{" "}
                  </span>
                  <span className="text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(30px, 4.4vw, 56px)", textShadow: "0 0 40px rgba(0,207,255,0.35)" }}>
                    в подарок
                  </span>
                </h2>
                <p className="text-[#e6e6e6]/70 mb-6 max-w-xl leading-relaxed">
                  Доступ к премиум-сервисам на 3–6 месяцев и инструкции по оплате из РФ —
                  чтобы отрабатывать навыки на реальных делах без «сантехнических» блокеров.
                </p>

                <div className="flex flex-wrap gap-3">
                  {tools.map((t) => (
                    <div
                      key={t.name}
                      className="group relative px-4 py-2.5 bg-navy-900 border border-white/10 rounded-xl hover:border-cyber-blue/30 hover:shadow-[0_0_15px_rgba(0,207,255,0.12)] transition-all duration-300"
                    >
                      <span className="absolute top-1 right-2 text-[9px] font-mono text-[#e6e6e6]/30 group-hover:text-cyber-blue/50 transition-colors">
                        {t.n}
                      </span>
                      <span className="font-bold text-sm block text-white" style={{ fontFamily: HELV }}>{t.name}</span>
                      <span className="text-[10px] text-[#e6e6e6]/40 font-mono">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative bg-navy-900/80 border border-cyber-blue/20 rounded-2xl p-4 sm:p-6 backdrop-blur-sm shrink-0">
                <p className="text-center text-xs uppercase text-[#e6e6e6]/40 font-mono mb-4 tracking-widest">
                  Предложение истекает
                </p>
                <CountdownTimer targetDate="2026-08-15T00:00:00" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
