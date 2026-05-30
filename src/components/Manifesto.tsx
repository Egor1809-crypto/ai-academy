"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";
import { MANIFESTO } from "@/data/content";

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

/* ── Animated count-up hook ─────────────────────────────────── */
function useCountUp(end: string, duration = 2200) {
  const [value, setValue] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numMatch = end.match(/[\d.]+/);
          if (!numMatch) { setValue(end); return; }
          const target = parseFloat(numMatch[0]);
          const prefix = end.slice(0, end.indexOf(numMatch[0]));
          const suffix = end.slice(end.indexOf(numMatch[0]) + numMatch[0].length);
          const isFloat = numMatch[0].includes(".");
          const t0 = performance.now();
          function tick(now: number) {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const cur = target * eased;
            setValue(prefix + (isFloat ? cur.toFixed(1) : Math.round(cur).toString()) + suffix);
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { ref, value };
}

/* ── SVG corner decorations (ChainGPT style) ────────────────── */
function CornerTL({ color = "gold" }: { color?: string }) {
  const c = color === "gold" ? "rgba(0,207,255,0.4)" : "rgba(255,255,255,0.1)";
  return (
    <svg className="absolute top-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
      <path d="M0 16V1.5C0 0.672 0.672 0 1.5 0H16" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}
function CornerBR({ color = "gold" }: { color?: string }) {
  const c = color === "gold" ? "rgba(0,207,255,0.4)" : "rgba(255,255,255,0.1)";
  return (
    <svg className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
      <path d="M32 16V30.5C32 31.328 31.328 32 30.5 32H16" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Pulsing neon dot (ChainGPT indicator style) ─────────────── */
function NeonDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-40" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold shadow-[0_0_8px_rgba(0,207,255,0.6)]" />
    </span>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function Manifesto() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 bg-black" />
      <SectionParticles id="manifesto-particles" preset="fireflies" />
      {/* Radial glow — top center (ChainGPT style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse,rgba(0,207,255,0.06)_0%,transparent_70%)] pointer-events-none" />
      {/* Radial glow — bottom right */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(123,97,255,0.04)_0%,transparent_70%)] pointer-events-none" />
      {/* Diagonal lines (premium texture) */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(255,255,255,0.08) 60px, rgba(255,255,255,0.08) 61px)",
        }}
      />
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent blur-sm" />
      </div>

      <div className="relative z-10">

        {/* ═══════════ HEADLINE BLOCK — Malvah-scale typography ═══════════ */}
        <div className="pt-32 pb-24 md:pt-44 md:pb-32">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal direction="up">
              {/* Tag with neon dot */}
              <div className="flex items-center gap-3 mb-12 justify-center">
                <NeonDot />
                <span className="text-[11px] font-mono uppercase tracking-[0.35em] text-gray-500">
                  Манифест
                </span>
                <div className="w-16 h-px bg-gradient-to-r from-gold/40 to-transparent" />
              </div>

              {/* Huge headline — Malvah inspired (massive scale, tight leading) */}
              <h2 className="text-center">
                <span className="block text-5xl md:text-7xl lg:text-[110px] font-heading font-black leading-[0.85] tracking-[-0.02em] text-white/90">
                  Адаптируйся.
                </span>
                <span
                  className="block text-5xl md:text-7xl lg:text-[110px] font-heading font-black leading-[0.85] tracking-[-0.02em] mt-2"
                  style={{
                    background: "linear-gradient(135deg, #00CFFF 0%, #7B61FF 50%, #FF007A 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 40px rgba(0,207,255,0.15))",
                  }}
                >
                  Или уступи.
                </span>
              </h2>

              <p className="text-center text-lg md:text-xl text-gray-500 max-w-xl mx-auto mt-10 leading-relaxed">
                {MANIFESTO.subheadline}
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* ═══════════ STATS — ChainGPT neon card grid ═══════════ */}
        <div className="py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <ScrollReveal direction="up">
              <div className="flex items-center justify-center gap-4 mb-16">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-gold/60" />
                <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                  Данные, которые нельзя игнорировать
                </span>
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-gold/60" />
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {MANIFESTO.stats.map((stat, i) => (
                <StatCard key={i} stat={stat} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ TRIGGERS — Bold statements ═══════════ */}
        <div className="pb-28 md:pb-36">
          <div className="max-w-3xl mx-auto px-6">
            <div className="space-y-6">
              {MANIFESTO.triggers.map((trigger, i) => (
                <ScrollReveal key={i} direction="up" delay={i * 120}>
                  <div className="group relative pl-8 border-l border-white/[0.06] hover:border-gold/40 transition-colors duration-500 py-2">
                    {/* Neon dot on the border */}
                    <div className="absolute -left-[5px] top-4">
                      <span className="block w-[9px] h-[9px] bg-gold/40 group-hover:bg-gold group-hover:shadow-[0_0_12px_rgba(0,207,255,0.5)] transition-all duration-500 rounded-full" />
                    </div>
                    <p className="text-base md:text-lg text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors duration-500">
                      {trigger}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ── Stat Card — ChainGPT inspired with glow + corners ──────── */
function StatCard({
  stat,
  index,
}: {
  stat: (typeof MANIFESTO.stats)[number];
  index: number;
}) {
  const { ref, value } = useCountUp(stat.value, 2200);

  return (
    <ScrollReveal direction="up" delay={index * 80}>
      <div
        ref={ref}
        className="relative bg-white/[0.02] border border-white/[0.06] p-7 md:p-9 text-center group
          hover:border-gold/30 hover:bg-gold/[0.03]
          hover:shadow-[0_0_30px_rgba(0,207,255,0.08)]
          transition-all duration-700"
      >
        <CornerTL color="gold" />
        <CornerBR color="gold" />

        {/* Number index */}
        <span className="absolute top-3 left-3 text-[10px] font-mono text-gray-700 select-none">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div
          className="text-3xl md:text-4xl lg:text-5xl font-heading font-black mb-3 tracking-tight"
          style={{
            background: "linear-gradient(135deg, #00CFFF 0%, #E8E6FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {value}
        </div>
        <p className="text-sm text-gray-300 mb-2 leading-snug">
          {stat.label}
        </p>
        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.15em]">
          {stat.source}
        </p>
      </div>
    </ScrollReveal>
  );
}
