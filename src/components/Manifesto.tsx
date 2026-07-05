"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/Manifesto.tsx — VERSION 2.0.0
// Editorial-манифест «адаптируйся / или уступи» — тихий тёмный бит между WhyNow и pinned-
// Audience. Убраны HUD-статы (78%/10x — generic) и count-up/уголки. Триггеры подтянуты под
// рынок БФЛ. СОХРАНЕНО: SectionParticles (линии-светлячки).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const TRIGGERS = [
  "Пока вы разгребаете реестры вручную — кто-то уже собрал конвейер и забирает ваших клиентов.",
  "ИИ не заменит юриста. Но юрист с ИИ заменит юриста без него.",
  "Через год рынок БФЛ разделится на тех, у кого система, и тех, кто ищет, где взять дела.",
];

export default function Manifesto() {
  return (
    <section className="relative overflow-hidden bg-[#05070c] py-28 md:py-44" style={{ fontFamily: HELV }}>
      <SectionParticles id="manifesto-particles" preset="fireflies" />
      <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[560px] bg-[radial-gradient(ellipse,rgba(0,207,255,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyber-blue/[0.04] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <p className="font-mono text-[12px] tracking-[0.22em] uppercase text-cyber-blue/60 mb-8">манифест</p>

          <h2 className="leading-[0.88]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.035em" }}>
            <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(48px, 9vw, 128px)" }}>
              адаптируйся
            </span>
            <span
              className="block text-cyber-blue"
              style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(48px, 9vw, 128px)", textShadow: "0 0 70px rgba(0,207,255,0.45)" }}
            >
              или уступи
            </span>
          </h2>

          <p className="mt-10 font-serif-display italic text-[#e6e6e6]/60" style={{ fontSize: "clamp(20px, 2.6vw, 34px)", letterSpacing: "-0.01em" }}>
            Рынок банкротств не ждёт тех, кто стоит на месте.
          </p>
        </ScrollReveal>

        <div className="mt-16 md:mt-24 max-w-3xl">
          {TRIGGERS.map((t, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 120}>
              <div className="group flex items-start gap-6 border-t border-white/[0.08] py-7 md:py-9 hover:border-cyber-blue/40 transition-colors duration-500">
                <span className="font-mono text-[13px] text-cyber-blue/50 pt-2 shrink-0 group-hover:text-cyber-blue transition-colors">
                  0{i + 1}
                </span>
                <p
                  className="text-[#e6e6e6]/70 group-hover:text-[#f4f2ec] transition-colors duration-500"
                  style={{ fontFamily: HELV, fontWeight: 400, fontSize: "clamp(20px, 2.6vw, 30px)", lineHeight: 1.32, letterSpacing: "-0.01em" }}
                >
                  {t}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
