"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const steps = [
  {
    num: "01",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "AI уже здесь",
    text: "Топовые юристы и фирмы вооружаются AI, чтобы быть вне конкуренции. Те, кто не адаптируется — останутся позади.",
    color: "gold",
    glowColor: "rgba(0,207,255,0.08)",
  },
  {
    num: "02",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Экономия x10",
    text: "Задачи, занимавшие часы, решаются за минуты. Анализ договора — 5 минут вместо 3 часов. Иск — 15 минут вместо дня.",
    color: "cyber-purple",
    glowColor: "rgba(123,97,255,0.08)",
  },
  {
    num: "03",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Новые правила",
    text: "Через год те, кто освоил нейросети, будут задавать стандарты рынка. Начните сегодня — будьте впереди завтра.",
    color: "gold",
    glowColor: "rgba(0,207,255,0.12)",
  },
];

/* Staircase offsets — each card rises higher (negative margin-top on desktop) */
const STAIR_OFFSETS = ["md:mt-24", "md:mt-12", "md:mt-0"];

export default function WhyNow() {
  return (
    <section className="py-28 md:py-36 relative bg-navy-900 overflow-hidden">
      <SectionParticles id="whynow-particles" preset="constellation" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyber-purple/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-gold/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <ScrollReveal direction="up">
          <div className="mb-20 md:mb-28 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/40" />
              <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-600">
                Почему сейчас
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/40" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5">
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
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Искусственный интеллект трансформирует юридическую отрасль быстрее, чем любую другую
            </p>
          </div>
        </ScrollReveal>

        {/* Staircase cards with curved arrow */}
        <div className="relative">

          {/* ═══ Curved arrow SVG — visible on desktop ═══ */}
          <svg
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-20"
            viewBox="0 0 1200 500"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Curved path from card 1 bottom-right to card 3 top */}
            <path
              d="M250 380 C350 380, 400 280, 600 260 S850 120, 970 100"
              stroke="url(#arrowGrad)"
              strokeWidth="2"
              strokeDasharray="8 4"
              fill="none"
              opacity="0.5"
            />
            {/* Arrow head */}
            <polygon
              points="960,92 975,100 962,110"
              fill="#00CFFF"
              opacity="0.6"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00CFFF" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#7B61FF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00CFFF" stopOpacity="0.7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Cards grid — staircase layout */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-end">
            {steps.map((step, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 150}>
                <div className={`relative ${STAIR_OFFSETS[i]}`}>

                  {/* Step number — big, floating behind */}
                  <div
                    className="absolute -top-8 -left-2 text-[80px] md:text-[100px] font-heading font-black leading-none select-none pointer-events-none opacity-[0.04]"
                  >
                    {step.num}
                  </div>

                  {/* Card */}
                  <div
                    className="relative bg-white/[0.02] backdrop-blur-sm border border-white/[0.07] p-8 md:p-9 group
                      hover:border-gold/40 transition-all duration-700
                      hover:bg-white/[0.04]"
                    style={{
                      boxShadow: `0 0 0 0 transparent`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${step.glowColor}`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`;
                    }}
                  >
                    {/* Corner accents */}
                    <svg className="absolute top-0 left-0 w-7 h-7 pointer-events-none" viewBox="0 0 28 28" fill="none">
                      <path d="M0 14V1.5C0 0.672 0.672 0 1.5 0H14" stroke={step.color === "cyber-purple" ? "rgba(123,97,255,0.4)" : "rgba(0,207,255,0.4)"} strokeWidth="1.5" />
                    </svg>
                    <svg className="absolute bottom-0 right-0 w-7 h-7 pointer-events-none" viewBox="0 0 28 28" fill="none">
                      <path d="M28 14V26.5C28 27.328 27.328 28 26.5 28H14" stroke={step.color === "cyber-purple" ? "rgba(123,97,255,0.4)" : "rgba(0,207,255,0.4)"} strokeWidth="1.5" />
                    </svg>

                    {/* Number badge */}
                    <div className="flex items-center justify-between mb-7">
                      <span className="text-xs font-mono text-gray-600 tracking-wider">{step.num}</span>
                      {/* Progress dots */}
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((dot) => (
                          <div
                            key={dot}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                              dot <= i
                                ? step.color === "cyber-purple"
                                  ? "bg-cyber-purple"
                                  : "bg-gold"
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-14 h-14 flex items-center justify-center mb-6 ${
                        step.color === "cyber-purple"
                          ? "bg-cyber-purple/10 border border-cyber-purple/20"
                          : "bg-gold/10 border border-gold/20"
                      } group-hover:scale-110 transition-transform duration-500`}
                    >
                      <svg
                        className={`w-7 h-7 ${step.color === "cyber-purple" ? "text-cyber-purple" : "text-gold"}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                      </svg>
                    </div>

                    <h3 className="font-heading font-bold text-xl md:text-2xl mb-3 text-white group-hover:text-gold transition-colors duration-500">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-[15px]">{step.text}</p>

                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 ${
                      step.color === "cyber-purple"
                        ? "bg-gradient-to-r from-cyber-purple/60 to-transparent"
                        : "bg-gradient-to-r from-gold/60 to-transparent"
                    }`} />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
