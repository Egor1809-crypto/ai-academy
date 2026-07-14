"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// FILE: src/components/Hero.tsx
// VERSION: 2.0.0
// Редизайн первого экрана в editorial-язык (гротеск + serif-курсив + циан-крещендо,
// сломанная иерархия, воздух). СОХРАНЕНЫ бренд-маскот Маняша и эффекты линий
// (ParticleBackground + ManyashaOrbit) — по требованию. Убраны gold/purple-градиенты HUD.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const ParticleBackground = dynamic(() => import("./ParticleBackground"), { ssr: false });
const Manyasha = dynamic(() => import("./Manyasha"), { ssr: false });
const ManyashaEffects = dynamic(() => import("./ManyashaEffects"), { ssr: false });
const ManyashaOrbit = dynamic(() => import("./ManyashaOrbit"), { ssr: false });

export default function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 overflow-x-clip" style={{ fontFamily: HELV }}>
      <div className="absolute inset-0 bg-navy-900 z-0" />
      <div className="absolute inset-0 bg-tech-grid z-0" />
      {/* СОХРАНЕНО: частицы-линии (сеть платформы) */}
      <ParticleBackground />

      {/* Ambient-свет унифицирован в циан (было gold/purple) */}
      <div className="absolute top-1/3 left-0 w-[520px] h-[520px] bg-cyber-blue/[0.06] rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-1/4 right-1/4 w-[420px] h-[420px] bg-cyber-blue/[0.05] rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/25 to-transparent z-10" />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-[1.3fr_0.85fr] gap-10 lg:gap-4 items-center">
          <div className="text-left">
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-cyber-blue/60 mb-7">
              первая в России · ИИ для юриста по банкротству
            </p>

            {/* Editorial-заголовок: только текст с фото, огромный кегль, три голоса */}
            <h1
              className="mb-6 leading-[0.9]"
              style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.035em" }}
            >
              <span
                className="font-serif-display italic block text-[#e6e6e6]/50 mb-2"
                style={{ fontSize: "clamp(24px, 3.2vw, 46px)" }}
              >
                нейросети для юристов
              </span>
              <span
                className="block text-white"
                style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(52px, 8.4vw, 118px)" }}
              >
                работайте
              </span>
              <span
                className="block text-cyber-blue"
                style={{
                  fontFamily: HELV,
                  fontWeight: 800,
                  fontSize: "clamp(54px, 8.6vw, 120px)",
                  lineHeight: 0.84,
                  textShadow: "0 0 70px rgba(0,207,255,0.45)",
                }}
              >
                быстрее всех
              </span>
            </h1>

            {/* Слоган из реальной кампании — главный триггер «Хаос → Система» */}
            <p
              className="font-serif-display italic mb-9"
              style={{ fontSize: "clamp(22px, 3vw, 40px)", letterSpacing: "-0.01em" }}
            >
              <span className="text-[#e6e6e6]/85">хаос</span>
              <span className="text-cyber-blue mx-3" style={{ fontFamily: HELV, fontStyle: "normal" }}>→</span>
              <span className="text-white">система</span>
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-4 items-center">
              <a
                href="#tariffs"
                className="group inline-flex items-center gap-2.5 bg-cyber-blue text-navy-900 rounded-full px-8 py-4 text-[15px] font-semibold transition-all duration-300 hover:shadow-[0_0_44px_-6px_rgba(0,207,255,0.65)] hover:-translate-y-0.5"
                style={{ fontFamily: HELV }}
              >
                Получить доступ
                <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <Link
                href="/program"
                className="text-[15px] text-[#e6e6e6]/70 hover:text-white border-b border-[#e6e6e6]/25 hover:border-white pb-1 transition-all"
                style={{ fontFamily: HELV }}
              >
                Программа курса
              </Link>
            </div>
          </div>

          {/* СОХРАНЕНО: маскот Маняша + орбита-линии + эффекты */}
          <div className="relative flex justify-center lg:justify-end lg:-mr-12">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-blue/[0.10] rounded-full blur-[150px] pointer-events-none animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyber-blue/[0.07] rounded-full blur-[120px] pointer-events-none" />

            <ManyashaEffects />

            <div className="mascot-float relative z-10 w-full scale-125 lg:scale-[1.8] translate-y-[calc(2.5rem+3cm)] lg:translate-y-[calc(4rem+3cm)] origin-center">
              <ManyashaOrbit />

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

        {/* Манифест вместо счётчиков — продолжение «хаос → система»: про построение нового.
            Без тире, без повтора «система», перенос сбалансирован (text-balance). */}
        <div className="mt-16 md:mt-24 max-w-3xl">
          <p
            className="font-serif-display italic text-[#e6e6e6]/75 text-balance"
            style={{ fontSize: "clamp(22px, 2.9vw, 40px)", lineHeight: 1.4, letterSpacing: "-0.01em" }}
          >
            Секрет перемен в том, чтобы сосредоточить всю энергию не на борьбе со старой
            системой, а на построении{" "}
            <span
              className="not-italic text-cyber-blue"
              style={{ fontFamily: HELV, fontWeight: 700, textShadow: "0 0 44px rgba(0,207,255,0.35)" }}
            >
              нового
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
