"use client";

import dynamic from "next/dynamic";

// FILE: src/app/tariffs/TariffsHero.tsx — VERSION 2.0.0
// Editorial+циан интро над <Tariffs/> (у него свой заголовок «три ступени → в систему»),
// поэтому тут — короткий интро + гарантии, без дубля большого H1. Убран cyber-blue.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("@/components/SectionParticles"), { ssr: false });

const guarantees = [
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "7 дней гарантия", text: "Полный возврат средств, если курс не подойдёт. Без вопросов и бюрократии." },
  { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", title: "Рассрочка 0%", text: "Разбейте платёж на 12 месяцев без переплат. Начните учиться сейчас." },
  { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Налоговый вычет 13%", text: "По «Практику» и «Внедрению» — верните часть стоимости через вычет на образование." },
];

export default function TariffsHero() {
  return (
    <section className="pt-28 pb-8 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <SectionParticles id="tariffs-page-particles" preset="sparks" />
      <div aria-hidden className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyber-blue/[0.05] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">тарифы и гарантии</p>
          <h1 className="leading-[0.92] mb-5" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
            <span className="text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(34px, 5.2vw, 68px)" }}>три формата </span>
            <span className="text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(34px, 5.2vw, 68px)", textShadow: "0 0 50px rgba(0,207,255,0.35)" }}>под вашу практику</span>
          </h1>
          <p className="text-[#e6e6e6]/55 text-lg max-w-2xl leading-relaxed">
            От самостоятельного старта до внедрения системы под ключ. Ниже — что именно входит в каждый.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {guarantees.map((g, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 hover:border-cyber-blue/30 transition-all duration-500">
              <div className="w-12 h-12 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={g.icon} />
                </svg>
              </div>
              <h3 className="text-white text-lg mb-2" style={{ fontFamily: HELV, fontWeight: 700, textTransform: "none" }}>{g.title}</h3>
              <p className="text-[#e6e6e6]/55 text-sm leading-relaxed">{g.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
