"use client";

import ScrollReveal from "./ScrollReveal";

const cards = [
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "AI уже здесь",
    text: "Топовые юристы и фирмы вооружаются AI, чтобы быть вне конкуренции. Те, кто не адаптируется — останутся позади.",
    accent: "gold",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Экономия x10",
    text: "Задачи, занимавшие часы, решаются за минуты. Анализ договора — 5 минут вместо 3 часов. Иск — 15 минут вместо дня.",
    accent: "cyber-purple",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Новые правила",
    text: "Через год те, кто освоил нейросети, будут задавать стандарты рынка. Начните сегодня — будьте впереди завтра.",
    accent: "gold",
  },
];

function CornerTL() {
  return (
    <svg
      className="absolute top-0 left-0 w-6 h-6 pointer-events-none"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 12V1C0 0.448 0.448 0 1 0H12"
        stroke="#00CFFF"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

function CornerBR() {
  return (
    <svg
      className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 12V23C24 23.552 23.552 24 23 24H12"
        stroke="#00CFFF"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export default function WhyNow() {
  return (
    <section className="py-28 relative bg-navy-900 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyber-purple/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Профессия юриста{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #00CFFF 0%, #7B61FF 50%, #FF007A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                меняется прямо сейчас
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Искусственный интеллект трансформирует юридическую отрасль быстрее, чем любую другую
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => {
            const num = String(i + 1).padStart(2, "0");
            const delay = i * 100;
            return (
              <ScrollReveal key={i} direction="up" delay={delay}>
                <div
                  className="relative bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 group hover:border-gold/50 hover:shadow-[0_0_25px_rgba(0,207,255,0.15)] transition-all duration-500 hover:bg-white/[0.06]"
                >
                  <CornerTL />
                  <CornerBR />

                  <span className="absolute top-3 left-3 text-xs font-mono text-gray-500 select-none">
                    {num}
                  </span>

                  <div
                    className={`w-14 h-14 flex items-center justify-center mb-6 mt-2 ${
                      card.accent === "cyber-purple"
                        ? "bg-cyber-purple/10 border border-cyber-purple/20"
                        : "bg-gold/10 border border-gold/20"
                    }`}
                  >
                    <svg
                      className={`w-7 h-7 ${card.accent === "cyber-purple" ? "text-cyber-purple" : "text-gold"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>

                  <h3 className="font-heading font-bold text-xl mb-3 text-white">{card.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{card.text}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
