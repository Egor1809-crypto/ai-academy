"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/DataSecurity.tsx — VERSION 2.0.0
// Редизайн editorial+циан. Секция снимает главный блокёр внедрения (комплаенс/ФЗ-152,
// адвокатская тайна — подтверждён Мастер-анализом). Убраны gold, HUD-уголки, dossier-card.
// СОХРАНЕНО: SectionParticles (линии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

interface Point {
  title: string;
  desc: string;
  icon: string;
}

const POINTS: Point[] = [
  {
    title: "Данные не покидают контур",
    desc: "Учим работать с локальными моделями (Ollama, on-premise) — материалы доверителя не уходят в чужое облако.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Российские сервисы для чувствительного",
    desc: "Где нужен облачный ИИ — приоритет сервисам с хранением данных в РФ. Меньше рисков по трансграничной передаче ПДн.",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Работа по 152-ФЗ",
    desc: "Обезличивание, согласия, что можно и что нельзя загружать в ИИ. Соответствие требованиям при обработке ПДн.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Проверка перед подачей",
    desc: "Как ловить галлюцинации ИИ и не отправить в суд выдуманную практику или норму. Ответственность остаётся на юристе.",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
];

export default function DataSecurity() {
  return (
    <section className="py-14 sm:py-20 md:py-28 relative overflow-hidden bg-navy-800" style={{ fontFamily: HELV }}>
      <SectionParticles id="security-particles" preset="constellation" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute bottom-0 right-1/4 w-[460px] h-[460px] bg-cyber-blue/[0.04] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-16 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">безопасность · 152-ФЗ</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(38px, 5.6vw, 82px)" }}>
                тайна клиента —
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 5.8vw, 84px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                под контролем
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-2xl leading-relaxed">
              ИИ не должен стоить вам адвокатской тайны. Это главный блокёр внедрения — и мы снимаем его на практике, а не обещаниями.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {POINTS.map((p, i) => (
            <ScrollReveal key={p.title} direction="up" delay={(i % 4) * 80}>
              <div className="relative h-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 hover:border-cyber-blue/35 hover:bg-cyber-blue/[0.03] transition-colors duration-300">
                <span className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={p.icon} />
                  </svg>
                </span>
                <h3 className="text-white mb-2 leading-tight" style={{ fontFamily: HELV, fontWeight: 700, fontSize: "17px", textTransform: "none" }}>
                  {p.title}
                </h3>
                <p className="text-sm text-[#e6e6e6]/50 leading-relaxed">{p.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
