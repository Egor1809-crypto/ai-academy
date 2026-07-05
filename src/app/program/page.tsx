"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import Program from "@/components/Program";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import ScrollReveal from "@/components/ScrollReveal";

// FILE: src/app/program/page.tsx — VERSION 2.0.0
// Переписано: убраны 450 строк bespoke-модулей (4 generic, Midjourney/Runway) → переиспользуем
// редизайненный <Program/> (8 уроков БФЛ, Урок 6 ★) + <FAQ/> + <CTA/>. Editorial-hero.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("@/components/SectionParticles"), { ssr: false });

const stats = [
  { value: "8", label: "уроков" },
  { value: "40+", label: "шаблонов БФЛ" },
  { value: "6", label: "★ практикум банкротство" },
  { value: "13%", label: "налоговый вычет" },
];

export default function ProgramPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20" style={{ fontFamily: HELV }}>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-navy-900">
          <SectionParticles id="program-hero-particles" preset="constellation" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,207,255,0.06)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/25 to-transparent" />

          <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 relative z-10">
            <ScrollReveal direction="up">
              <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">программа обучения · 8 уроков</p>
              <h1 className="leading-[0.9] mb-8 max-w-4xl" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.035em" }}>
                <span className="font-serif-display italic block text-[#e6e6e6]/50 mb-2" style={{ fontSize: "clamp(20px, 2.8vw, 40px)" }}>
                  восемь уроков —
                </span>
                <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 6.4vw, 96px)" }}>
                  от физики LLM
                </span>
                <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(42px, 6.6vw, 98px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                  до своего конвейера
                </span>
              </h1>
              <p className="text-[#e6e6e6]/55 text-lg md:text-xl max-w-2xl leading-relaxed mb-12">
                Всё под БФЛ и под Windows. Урок 6 — практикум по банкротству (реестр, отзывы, жалобы, оспаривание сделок), которого нет ни у кого.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl">
                {stats.map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/10 px-4 py-5 text-center hover:border-cyber-blue/30 transition-colors duration-500">
                    <div className="text-3xl md:text-4xl font-black text-cyber-blue tabular-nums leading-none mb-2" style={{ fontFamily: HELV, textShadow: "0 0 30px rgba(0,207,255,0.3)" }}>
                      {s.value}
                    </div>
                    <span className="text-[10px] md:text-[11px] font-mono text-[#e6e6e6]/45 uppercase tracking-[0.1em]">{s.label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Программа (переиспользуемый компонент) ── */}
        <Program />

        {/* ── FAQ + финал ── */}
        <FAQ />
        <CTA />
      </main>
      <FooterCompact />
    </>
  );
}
