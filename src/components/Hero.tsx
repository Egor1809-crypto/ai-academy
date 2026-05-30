"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AnimatedCounter from "./AnimatedCounter";
import { HERO_COUNTERS, COURSE } from "@/data/content";

const ParticleBackground = dynamic(() => import("./ParticleBackground"), {
  ssr: false,
});

const Manyasha = dynamic(() => import("./Manyasha"), {
  ssr: false,
});

const ManyashaEffects = dynamic(() => import("./ManyashaEffects"), {
  ssr: false,
});

const ManyashaOrbit = dynamic(() => import("./ManyashaOrbit"), {
  ssr: false,
});

export default function Hero() {
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.spotsLeft === "number") setSpotsLeft(d.spotsLeft);
      })
      .catch(() => {});
  }, []);

  const spotsText =
    spotsLeft !== null
      ? spotsLeft > 0
        ? `Набор открыт — осталось ${spotsLeft} мест`
        : "Набор закрыт — мест нет"
      : "Набор открыт — загрузка...";

  return (
    <section className="relative pt-32 lg:pt-40 pb-20 overflow-x-clip">
      <div className="absolute inset-0 bg-navy-900 z-0" />
      <div className="absolute inset-0 bg-tech-grid z-0" />
      <ParticleBackground />

      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyber-purple/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-10" />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-0 items-center">
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-[3.75rem] font-bold leading-[1.1] mb-8 tracking-tight">
              <span className="block text-white">Нейросети</span>
              <span className="block text-white">для юристов:</span>
              <span className="block text-gradient-gold mt-2">работайте быстрее</span>
              <span className="block text-gradient-gold">конкурентов</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-xl font-light leading-relaxed">
              Практический курс от экспертов-юристов. Промпты, инструменты и методики,
              разработанные специально для юридической практики.{" "}
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-gold hover:text-cyan-300 transition-colors font-medium"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                </span>
                {spotsText}
              </Link>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start mb-8 mt-10">
              <a
                href="#tariffs"
                className="relative group px-10 py-4 bg-linear-to-r from-cyber-purple to-gold text-white font-heading font-bold uppercase tracking-widest text-base rounded-full overflow-hidden glow-purple transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,0,122,0.6)] hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-3">
                  Получить доступ
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </a>
              <Link
                href="/program"
                className="px-10 py-4 border border-white/20 text-white font-heading font-bold uppercase tracking-widest text-base rounded-full hover:border-gold hover:text-gold transition-all duration-300 backdrop-blur-sm"
              >
                Программа курса
              </Link>
            </div>

            <p className="text-sm text-gray-500 font-mono">
              Старт ближайшего потока: <span className="text-gold font-bold">{COURSE.startDate}</span>
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:-mr-12">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyber-purple/8 rounded-full blur-[120px] pointer-events-none" />

            {/* Visual effects around Manyasha */}
            <ManyashaEffects />

            <div className="mascot-float relative z-10 w-full scale-110 lg:scale-125 translate-y-10 lg:translate-y-16 origin-center">
              <ManyashaOrbit />

              {/* ── Голо-проектор: чистый СИММЕТРИЧНЫЙ луч строго ВНИЗ из-под платформы ──
                   Вся группа обёрнута в один слой с горизонтальным сдвигом (--holo-x),
                   чтобы точно совпасть с центром платформы на картинке.
                   Если луч съезжает вбок — меняется ТОЛЬКО translateX у этого враппера. */}
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ transform: "translateX(-4%)" }}
              >
                {/* Яркий эмиттер-источник прямо под платформой */}
                <div
                  className="absolute left-1/2 top-[95%] w-[30%] h-[5px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, rgba(170,245,255,0.95) 35%, rgba(150,242,255,1) 50%, rgba(170,245,255,0.95) 65%, transparent)",
                    filter: "blur(2px)",
                    mixBlendMode: "screen",
                    animation: "holo-emitter 3s ease-in-out infinite",
                  }}
                />
                {/* Гало вокруг эмиттера */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-[93%] w-[40%] h-[10%]"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(140,240,255,0.6) 0%, rgba(0,207,255,0.26) 45%, transparent 72%)",
                    filter: "blur(8px)",
                    mixBlendMode: "screen",
                    animation: "holo-pulse 3.2s ease-in-out infinite",
                  }}
                />

                {/* Мягкая объёмная подсветка под лучами (амбиент, без чёткого края) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-[96%] w-[70%] h-[40%]"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,207,255,0.22) 0%, rgba(123,97,255,0.08) 55%, transparent 100%)",
                    clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
                    filter: "blur(16px)",
                    mixBlendMode: "screen",
                    animation: "holo-flicker 3.4s ease-in-out infinite",
                  }}
                />

                {/* ── Веер тонких разноцветных лучей, расходящихся ВНИЗ из эмиттера ── */}
                {[
                  { rot: -17, w: 5.5, color: "rgba(120,235,255,0.55)", h: 38, dur: "4.6s", delay: "0s" },
                  { rot: -10, w: 4, color: "rgba(123,97,255,0.5)", h: 41, dur: "5.2s", delay: "0.5s" },
                  { rot: -4, w: 6.5, color: "rgba(150,240,255,0.7)", h: 43, dur: "3.8s", delay: "0.2s" },
                  { rot: 4, w: 6.5, color: "rgba(0,207,255,0.7)", h: 43, dur: "4.1s", delay: "0.7s" },
                  { rot: 11, w: 4, color: "rgba(255,80,170,0.4)", h: 40, dur: "5.4s", delay: "0.35s" },
                  { rot: 18, w: 5.5, color: "rgba(120,235,255,0.55)", h: 37, dur: "4.8s", delay: "0.6s" },
                ].map((b, i) => (
                  <div
                    key={`beam-${i}`}
                    className="absolute left-1/2 top-[95%]"
                    style={{
                      width: `${b.w}%`,
                      height: `${b.h}%`,
                      transformOrigin: "50% 0%",
                      transform: `translateX(-50%) rotate(${b.rot}deg)`,
                      background: `linear-gradient(to bottom, ${b.color} 0%, transparent 90%)`,
                      clipPath: "polygon(28% 0, 72% 0, 100% 100%, 0 100%)",
                      filter: "blur(3px)",
                      mixBlendMode: "screen",
                      animation: `holo-flicker ${b.dur} ease-in-out infinite ${b.delay}`,
                    }}
                  />
                ))}

                {/* Тонкий яркий центральный луч-стержень */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-[95%] w-[3%] h-[40%]"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(190,250,255,0.85) 0%, rgba(0,207,255,0.3) 55%, transparent 100%)",
                    filter: "blur(2px)",
                    mixBlendMode: "screen",
                    animation: "holo-emitter 3.2s ease-in-out infinite",
                  }}
                />

              </div>

              <div className="relative z-10">
                <Manyasha
                  size="hero"
                  hoverSpeech="Привет! Я Маняша — твой AI-помощник по юридическим нейросетям!"
                  pages={[
                    { label: "О курсе", href: "/about", speech: "Расскажу всё о нашем курсе!" },
                    { label: "Программа", href: "/program", speech: "Покажу программу обучения..." },
                    { label: "Эксперты", href: "/experts", speech: "Познакомлю с нашими спикерами!" },
                    { label: "Тарифы", href: "/tariffs", speech: "Подберём подходящий тариф!" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl">
          {HERO_COUNTERS.map((c) => (
            <AnimatedCounter key={c.label} end={c.end} suffix={c.suffix} label={c.label} />
          ))}
        </div>
      </div>

    </section>
  );
}
