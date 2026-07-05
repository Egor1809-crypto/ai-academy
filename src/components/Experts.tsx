"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { EXPERTS } from "@/data/content";

// FILE: src/components/Experts.tsx — VERSION 2.0.0
// Редизайн editorial+циан: убраны gold, uppercase-имена и HUD-уголки. Философия основателя
// переписана под «коммодити → система» (чтобы не дублировать триггер из Manifesto). Фото и
// состав экспертов (данные EXPERTS) сохранены.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const frontman = EXPERTS.find((e) => e.isFounder)!;
const experts = EXPERTS.filter((e) => !e.isFounder);

const PHILOSOPHY =
  "«Нейросети для юристов» — уже коммодити. Ценность не в том, чтобы нажимать кнопки, а в том, чтобы собрать из хаоса инструментов рабочую систему под банкротство — и довести её до внедрения в вашей практике.";

function PhilosophyLayer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-navy-900/95 backdrop-blur-md border border-cyber-blue/25 rounded-2xl p-5 md:p-8 shadow-[0_22px_60px_rgba(0,0,0,0.55)] ${className}`}
      style={{ fontFamily: HELV }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyber-blue/60 block mb-5">наша философия</span>
      <blockquote
        className="font-serif-display italic text-white/90 leading-relaxed mb-5"
        style={{ fontSize: "clamp(17px, 1.5vw, 21px)" }}
      >
        {PHILOSOPHY}
      </blockquote>
      <div className="w-10 h-px bg-cyber-blue/40 mb-3" />
      <p className="text-cyber-blue text-sm font-semibold">{frontman.name}</p>
      <p className="text-[#e6e6e6]/40 text-xs font-mono mt-0.5">Основатель AI Legal</p>
    </div>
  );
}

export default function Experts() {
  return (
    <section id="experts" className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-cyber-blue/[0.05] rounded-full blur-[150px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-16 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">эксперты</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 6.2vw, 90px)" }}>
                не теоретики —
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(42px, 6.4vw, 92px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                практики
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Те, кто ежедневно ведёт банкротные дела с ИИ — а не рассказывает о нём с трибуны.
            </p>
          </div>
        </ScrollReveal>

        {/* Frontman — featured card */}
        <ScrollReveal direction="up" delay={0}>
          <div className="group mb-10 relative">
            <span className="font-mono text-xs text-cyber-blue/50 mb-2 block">01</span>
            <div className="relative flex flex-col md:flex-row bg-navy-800 border border-white/10 rounded-2xl overflow-hidden hover:border-cyber-blue/40 hover:shadow-[0_0_30px_rgba(0,207,255,0.15)] hover:-translate-y-1 transition-all duration-500 lg:pr-[21rem] xl:pr-[24rem] lg:min-h-[540px]">
              <div className="relative w-full md:w-80 aspect-square md:aspect-auto md:min-h-[320px] lg:min-h-[540px] bg-navy-700 shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                <Image
                  src={frontman.photo}
                  alt={frontman.name}
                  fill
                  className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-800/60 via-transparent to-navy-800/20 z-[5]" />
              </div>

              <div className="flex flex-col justify-center p-5 md:p-12 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyber-blue/10 border border-cyber-blue/20 rounded-full w-fit mb-5">
                  <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-pulse" />
                  <span className="text-cyber-blue text-xs font-mono uppercase tracking-widest">Основатель</span>
                </div>
                <h3 className="mb-2" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(28px, 3.4vw, 40px)", letterSpacing: "-0.02em", textTransform: "none" }}>
                  {frontman.name}
                </h3>
                <p className="text-cyber-blue text-sm font-medium">{frontman.role}</p>
                <div className="w-12 h-px bg-cyber-blue/40 mt-3 mb-5" />
                <p className="text-[#e6e6e6]/55 leading-relaxed max-w-xl group-hover:text-[#e6e6e6]/75 transition-colors">
                  {frontman.desc}
                </p>
                <div className="flex gap-8 mt-8">
                  <div>
                    <p className="text-2xl font-bold text-cyber-blue" style={{ fontFamily: HELV }}>50+</p>
                    <p className="text-xs text-[#e6e6e6]/40 font-mono uppercase tracking-wider mt-1">ИИ-внедрений</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyber-blue" style={{ fontFamily: HELV }}>15+</p>
                    <p className="text-xs text-[#e6e6e6]/40 font-mono uppercase tracking-wider mt-1">лет в юриспруденции</p>
                  </div>
                </div>
              </div>
            </div>

            <PhilosophyLayer className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-5 xl:right-4 w-[19rem] xl:w-[21rem] z-30 rotate-1" />
            <PhilosophyLayer className="lg:hidden mt-6" />
          </div>
        </ScrollReveal>

        {/* Other experts — grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {experts.map((e, i) => (
            <ScrollReveal key={e.name} direction="up" delay={(i + 1) * 100}>
              <div className="group">
                <span className="font-mono text-xs text-cyber-blue/50 mb-2 block">{String(i + 2).padStart(2, "0")}</span>
                <div className="relative w-full aspect-[4/5] bg-navy-800 border border-white/10 rounded-2xl mb-4 overflow-hidden hover:border-cyber-blue/30 hover:shadow-[0_0_20px_rgba(0,207,255,0.12)] hover:-translate-y-1 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/90 z-10" />
                  <div className="absolute inset-0 bg-cyber-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[5]" />
                  <Image
                    src={e.photo}
                    alt={e.name}
                    fill
                    className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-5 z-20">
                    <div className="w-8 h-1 bg-cyber-blue mb-3 transform origin-left group-hover:scale-x-150 transition-transform duration-500" />
                    <h3 style={{ fontFamily: HELV, fontWeight: 700, fontSize: "20px", letterSpacing: "-0.01em", textTransform: "none" }}>{e.name}</h3>
                    <p className="text-cyber-blue text-sm font-medium mt-1">{e.role}</p>
                  </div>
                </div>
                <p className="text-sm text-[#e6e6e6]/50 group-hover:text-[#e6e6e6]/70 transition-colors">{e.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
