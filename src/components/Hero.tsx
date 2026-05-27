"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import AnimatedCounter from "./AnimatedCounter";

const ParticleBackground = dynamic(() => import("./ParticleBackground"), {
  ssr: false,
});

const MascotSprite = dynamic(() => import("./MascotSprite"), {
  ssr: false,
});

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-navy-900 z-0" />
      <div className="absolute inset-0 bg-tech-grid z-0" />
      <ParticleBackground />

      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyber-purple/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-10" />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="text-left">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-navy-800/80 border border-white/10 backdrop-blur-sm text-xs font-mono text-gray-400 mb-8 uppercase tracking-widest">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
              </span>
              Набор открыт — осталось 12 мест
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[4.5rem] font-bold leading-[1.08] mb-8 tracking-tight">
              <span className="block text-white">Нейросети</span>
              <span className="block text-white">для юристов:</span>
              <span className="block text-gradient-gold mt-2">работайте быстрее</span>
              <span className="block text-gradient-gold">конкурентов</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl font-light leading-relaxed">
              Практический курс от экспертов-юристов. Промпты, инструменты и методики,
              разработанные специально для юридической практики.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start mb-8">
              <Link
                href="/tariffs"
                className="relative group px-10 py-5 bg-linear-to-r from-cyber-purple to-gold text-white font-heading font-bold uppercase tracking-widest text-lg overflow-hidden glow-purple transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,0,122,0.6)] hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-3">
                  Получить доступ
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/program"
                className="px-10 py-5 border border-white/20 text-white font-heading font-bold uppercase tracking-widest text-lg hover:border-gold hover:text-gold transition-all duration-300 backdrop-blur-sm"
              >
                Программа курса
              </Link>
            </div>

            <p className="text-sm text-gray-500 font-mono">
              Старт ближайшего потока: <span className="text-gold font-bold">15 Июля 2026</span>
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:-mr-8">
            <div className="relative w-full max-w-xl lg:max-w-[620px]">
              {/* Glow effects behind mascot — ChainGPT-style multi-layer glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
              <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-cyber-purple/8 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-gold/6 rounded-full blur-[80px] pointer-events-none" />

              {/* Mascot — Canvas sprite animation with transparent frames */}
              <div className="mascot-float relative z-10 lg:scale-[1.15] origin-bottom">
                <MascotSprite
                  frameCount={16}
                  fps={10}
                  className="w-full h-auto drop-shadow-[0_0_80px_rgba(0,207,255,0.2)]"
                />
              </div>

              {/* Status badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-3 px-4 py-2 bg-navy-800/80 border border-gold/20 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                  <span className="text-xs font-mono text-gold uppercase tracking-widest">AI-ассистент активен</span>
                </div>
              </div>

              {/* Floating stat badges */}
              <div className="absolute -right-4 top-12 bg-navy-800/90 border border-gold/30 backdrop-blur-md px-4 py-3 hidden xl:block animate-[slideUp_0.6s_ease-out_0.4s_both] hover:shadow-[0_0_15px_rgba(0,207,255,0.2)] transition-shadow duration-300 z-20">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">Экономия времени</p>
                <p className="text-2xl font-heading font-bold text-gold">x10</p>
              </div>

              <div className="absolute -left-6 bottom-32 bg-navy-800/90 border border-white/10 backdrop-blur-md px-4 py-3 hidden xl:block animate-[slideUp_0.6s_ease-out_0.6s_both] hover:shadow-[0_0_15px_rgba(0,207,255,0.2)] transition-shadow duration-300 z-20">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">Точность анализа</p>
                <p className="text-2xl font-heading font-bold text-white">98%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl">
          <AnimatedCounter end={500} suffix="+" label="Выпускников" />
          <AnimatedCounter end={40} suffix="ч" label="Экономия в мес." />
          <AnimatedCounter end={98} suffix="%" label="Рекомендуют" />
          <AnimatedCounter end={15} suffix="+" label="Спикеров" />
        </div>
      </div>

    </section>
  );
}
