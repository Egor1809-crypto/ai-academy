"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// FILE: src/components/Audience.tsx — VERSION 2.0.0
// «Кому это нужно» — pinned scroll-focus: секция прилипает, по скроллу сменяется активный
// сегмент БФЛ (его хаос → его система). Реальные сегменты из кампании. Fallback на тач/
// узких экранах — вертикальная стопка. СОХРАНЕНО: SectionParticles (линии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const SEGMENTS = [
  {
    tag: "соло-юрист по БФЛ",
    role: "ядро аудитории",
    chaos: "Реестры, отзывы, жалобы — вручную. Каждое дело недели рутины, горящие дедлайны, вечно не хватает рук.",
    system: "Реестр, отзывы, жалобы за минуты, а не за вечер. Ведёте вдвое больше дел теми же руками.",
    metric: "×2",
    metricLabel: "дела без найма",
  },
  {
    tag: "арбитражный управляющий",
    role: "поток процедур",
    chaos: "Поток процедур и отчётности, штрафы за просроченные сроки, всё держится на вас.",
    system: "ИИ как младший юрист за 3 т.р./мес — вместо помощника за 100 000.",
    metric: "3 т.р.",
    metricLabel: "вместо 100 000/мес",
  },
  {
    tag: "адвокат",
    role: "второй контур",
    chaos: "Страшно доверить нейросети материалы доверителя — тайна, этика, ответственность.",
    system: "Использовать ИИ, не нарушая адвокатскую тайну и закон. Проверка галлюцинаций.",
    metric: "0",
    metricLabel: "рисков по тайне",
  },
  {
    tag: "юрфирма по БФЛ",
    role: "2–10 человек",
    chaos: "Расти можно только наймом — а новый сотрудник съедает и без того тонкую маржу.",
    system: "Больше дел без найма: регламент использования ИИ + обучение всей команды.",
    metric: "0",
    metricLabel: "новых наймов",
  },
];

function SegmentDetail({ s, active }: { s: (typeof SEGMENTS)[number]; active: number }) {
  return (
    <div key={active} className="animate-module-in">
      <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-cyber-blue/60 mb-6">
        сегмент {active + 1} / {SEGMENTS.length} · {s.role}
      </p>
      <h3
        className="text-white mb-8"
        style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(34px, 5vw, 68px)", letterSpacing: "-0.03em", lineHeight: 0.98, textTransform: "none" }}
      >
        {s.tag}
      </h3>

      <div className="space-y-5 max-w-xl">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-[#e6e6e6]/35 pt-1.5 shrink-0">хаос</span>
          <p className="text-[16px] md:text-[18px] leading-relaxed text-[#e6e6e6]/45 line-through decoration-[#e6e6e6]/20">
            {s.chaos}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-cyber-blue/70 pt-1.5 shrink-0">система</span>
          <p className="text-[16px] md:text-[18px] leading-relaxed text-[#f4f2ec]">{s.system}</p>
        </div>
      </div>

      <div className="mt-9 flex items-baseline gap-3">
        <span
          className="text-cyber-blue"
          style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(30px, 3.4vw, 46px)", textShadow: "0 0 40px rgba(0,207,255,0.35)" }}
        >
          {s.metric}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-wider text-[#e6e6e6]/40">{s.metricLabel}</span>
      </div>
    </div>
  );
}

export default function Audience() {
  const outerRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPinned(mq.matches && !rm.matches);
    update();
    mq.addEventListener("change", update);
    rm.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      rm.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const outer = outerRef.current;
    if (!outer) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const total = outer.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-outer.getBoundingClientRect().top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);
      setActive(Math.min(Math.floor(p * SEGMENTS.length), SEGMENTS.length - 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pinned]);

  const jumpTo = (i: number) => {
    const outer = outerRef.current;
    if (!outer || !pinned) return;
    const total = outer.offsetHeight - window.innerHeight;
    window.scrollTo({ top: outer.offsetTop + ((i + 0.5) / SEGMENTS.length) * total, behavior: "smooth" });
  };

  // Заголовок + индекс сегментов (общий для pinned-режима)
  const heading = (
    <>
      <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">целевая аудитория</p>
      <h2
        className="leading-[0.92] mb-10"
        style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}
      >
        <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(38px, 5.4vw, 78px)" }}>
          кому это
        </span>
        <span
          className="block text-cyber-blue"
          style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 5.6vw, 80px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}
        >
          нужно?
        </span>
      </h2>
      <div className="flex flex-col gap-0.5">
        {SEGMENTS.map((s, i) => (
          <button
            key={i}
            onClick={() => jumpTo(i)}
            className="group flex items-baseline gap-4 text-left py-2 cursor-pointer"
          >
            <span className={`font-mono text-[12px] tabular-nums transition-colors ${i === active ? "text-cyber-blue" : "text-[#e6e6e6]/25"}`}>
              0{i + 1}
            </span>
            <span
              className={`transition-all duration-300 ${i === active ? "text-white" : "text-[#e6e6e6]/30 group-hover:text-[#e6e6e6]/60"}`}
              style={{ fontFamily: HELV, fontWeight: i === active ? 600 : 400, fontSize: i === active ? "20px" : "18px", letterSpacing: "-0.01em" }}
            >
              {s.tag}
            </span>
          </button>
        ))}
      </div>
    </>
  );

  // ── Fallback: вертикальная стопка (тач / узкий экран / reduced-motion) ──
  if (!pinned) {
    return (
      <section id="about" className="relative bg-navy-800 py-16 md:py-24 overflow-hidden" style={{ fontFamily: HELV }}>
        <SectionParticles id="audience-particles" preset="matrix" />
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="mb-12">{heading}</div>
          <div className="space-y-14">
            {SEGMENTS.map((s, i) => (
              <SegmentDetail key={i} s={s} active={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Десктоп: pinned scroll-focus ──
  return (
    <section
      id="about"
      ref={outerRef}
      className="relative bg-navy-800"
      style={{ height: `${SEGMENTS.length * 78 + 20}vh`, fontFamily: HELV }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <SectionParticles id="audience-particles" preset="matrix" />
        <div aria-hidden className="absolute top-1/3 -left-40 w-[560px] h-[560px] rounded-full bg-cyber-blue/[0.06] blur-[150px] pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 right-1/4 w-[460px] h-[460px] rounded-full bg-cyber-blue/[0.04] blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-[40%_1fr] gap-12 items-center relative z-10">
          <div>{heading}</div>
          <div className="min-w-0">
            <SegmentDetail s={SEGMENTS[active]} active={active} />
          </div>
        </div>

        {/* Прогресс-линия секции */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-cyber-blue/50" style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}
