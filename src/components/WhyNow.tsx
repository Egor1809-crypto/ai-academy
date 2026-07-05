"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/WhyNow.tsx — VERSION 2.0.0
// Редизайн в editorial-язык (гротеск + serif-курсив + циан), копирайт подтянут под
// реальную БФЛ-кампанию (демпинг рынка, рутина, свободная ниша — «занять первым»).
// СОХРАНЕНО: constellation-частицы (линии), лесенка-смещение карточек (слом иерархии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const steps = [
  {
    num: "01",
    title: "Рынок жмёт маржу",
    text: "БФЛ обесценивается: фикс 80–150 тыс., демпинг до 95, сверху «бесплатное» МФЦ. Доход упирается в то, сколько дел вы тянете руками.",
  },
  {
    num: "02",
    title: "Рутина крадёт время",
    text: "Каждое дело — недели ручной работы: реестры, отзывы, жалобы, аудит сделок должника, Федресурс и КАД. Больше дел — нужны руки.",
  },
  {
    num: "03",
    title: "Окно открыто сейчас",
    text: "Ниша ИИ для банкротного юриста ещё не занята. Кто соберёт систему первым — задаёт стандарты рынка. Дальше будет поздно.",
  },
];

// Лесенка-смещения — карточки на разной высоте (намеренный слом ровной сетки).
const STAIR_OFFSETS = ["md:mt-24", "md:mt-12", "md:mt-0"];

export default function WhyNow() {
  // Стрелку рисуем в viewBox = пиксели контейнера (замер через ResizeObserver) —
  // 1:1, без растяжения → кривая и наконечник не искажаются.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 1150, h: 300 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setDim({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = dim;
  const pt = (fx: number, fy: number) => `${Math.round(fx * w)} ${Math.round(fy * h)}`;
  // «Свуш»: держится низко, затем резко взмывает вверх-вправо — читается как изгиб/восхождение.
  const arrowPath = `M ${pt(0.05, 0.86)} C ${pt(0.5, 0.86)}, ${pt(0.72, 0.66)}, ${pt(0.92, 0.1)}`;

  return (
    <section className="py-16 sm:py-24 md:py-36 relative bg-navy-900 overflow-hidden" style={{ fontFamily: HELV }}>
      <SectionParticles id="whynow-particles" preset="constellation" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[520px] h-[520px] bg-cyber-blue/[0.05] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-cyber-blue/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header — editorial, слева, сломанная иерархия */}
        <ScrollReveal direction="up">
          <div className="mb-16 md:mb-28 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">
              почему сейчас · голубой океан
            </p>
            <h2
              className="leading-[0.9]"
              style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}
            >
              <span
                className="font-serif-display italic block text-[#e6e6e6]/50 mb-2"
                style={{ fontSize: "clamp(22px, 3vw, 42px)" }}
              >
                профессия юриста
              </span>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 6.4vw, 92px)" }}>
                меняется
              </span>
              <span
                className="block text-cyber-blue"
                style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(42px, 6.6vw, 94px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}
              >
                прямо сейчас
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Ниша ИИ для юриста по банкротству ещё свободна. Кто соберёт систему первым —
              задаёт правила рынка.
            </p>
          </div>
        </ScrollReveal>

        {/* Карточки — лесенка + пунктирная изогнутая стрелка вверх (пронизывает три блока).
            viewBox = пиксели контейнера → без искажений при любом размере экрана. */}
        <div ref={wrapRef} className="relative">
          <svg
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-20"
            viewBox={`0 0 ${w} ${h}`}
            fill="none"
          >
            <defs>
              <marker
                id="wn-arrow"
                markerWidth="9"
                markerHeight="9"
                refX="5.5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M0.6 0.6 L6 3 L0.6 5.4"
                  fill="none"
                  stroke="#00CFFF"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </marker>
            </defs>
            <path
              d={arrowPath}
              stroke="#00CFFF"
              strokeWidth="2"
              strokeDasharray="2 10"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
              markerEnd="url(#wn-arrow)"
              style={{ animation: "dash-flow 1.1s linear infinite" }}
            />
          </svg>
          <div className="grid md:grid-cols-3 gap-5 md:gap-8 items-end">
            {steps.map((s, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 120}>
              <div className={`relative ${STAIR_OFFSETS[i]}`}>
                {/* Гигантский номер за карточкой — слом иерархии */}
                <div
                  className="absolute -top-12 right-1 font-black text-white/[0.035] pointer-events-none select-none leading-none"
                  style={{ fontFamily: HELV, fontSize: "clamp(90px, 11vw, 150px)" }}
                >
                  {s.num}
                </div>

                <div
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 transition-all duration-500 hover:border-cyber-blue/40 hover:bg-cyber-blue/[0.03] hover:-translate-y-1 hover:shadow-[0_0_44px_-10px_rgba(0,207,255,0.3)]"
                  style={{ fontFamily: HELV }}
                >
                  <div className="font-mono text-[13px] text-cyber-blue/70 mb-6 tracking-widest">{s.num}</div>
                  <h3
                    className="text-[#f4f2ec] mb-3 group-hover:text-cyber-blue transition-colors"
                    style={{ fontFamily: HELV, fontWeight: 600, fontSize: "clamp(19px, 2.1vw, 25px)", letterSpacing: "-0.01em", textTransform: "none" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[#e6e6e6]/55 text-[15px] leading-relaxed">{s.text}</p>
                  <div className="mt-6 h-px w-0 bg-gradient-to-r from-cyber-blue/60 to-transparent group-hover:w-full transition-all duration-700" />
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
