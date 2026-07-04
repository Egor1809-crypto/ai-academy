"use client";

import { useRef, useEffect, useState } from "react";
import LiveDemo from "./LiveDemo";

// FILE: src/components/CommandDeck.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Объединяет «Готовые команды» (карточки-боли) и живой чат-демо в ОДНУ секцию
//   с механикой pinned horizontal scroll: секция прилипает, вертикальный скролл → пан
//   вправо. Два экрана: [карточки] → [чат]. Клик по карточке авто-панит к чату и шлёт запрос.
// FALLBACK: на тач/узких экранах/prefers-reduced-motion — обычная вертикальная стопка
//   (карточки-сетка + полный чат снизу), без scroll-jacking.
// LANGUAGE: malvah — Helvetica, near-black, off-white, без капса/неона (в тон чату).
// KEYWORDS: DOMAIN(7): UX; CONCEPT(9): PinnedHorizontalScroll; TECH(8): React, rAF, sticky
// END_MODULE_CONTRACT

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

interface Command {
  title: string;
  desc: string;
  prompt: string;
  icon: string; // Heroicons outline path d, viewBox 0 0 24 24
}

const COMMANDS: Command[] = [
  {
    title: "Анализ договора",
    desc: "Риски, кабальные условия, что править",
    prompt:
      "Проанализируй договор поставки: перечисли ключевые риски для покупателя и что стоит изменить.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Ответ на претензию",
    desc: "Структура и аргументы за 2 минуты",
    prompt:
      "Составь структуру ответа на претензию о нарушении сроков поставки с юридическими аргументами.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Судебная практика",
    desc: "Позиции ВС РФ по вашему вопросу",
    prompt: "Подбери позицию ВС РФ по взысканию неустойки и её снижению по ст. 333 ГК РФ.",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  },
  {
    title: "Проверка контрагента",
    desc: "Due Diligence чек-лист перед сделкой",
    prompt: "Сделай чек-лист due diligence контрагента перед крупной сделкой: что проверить и где.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Составление иска",
    desc: "Каркас искового заявления",
    prompt: "Составь структуру искового заявления о взыскании задолженности по договору аренды.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    title: "Правовая позиция",
    desc: "Аргументы за и против по спору",
    prompt: "Сформируй правовую позицию по спору о качестве выполненных работ: аргументы обеих сторон.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "Оформление документа",
    desc: "Деловой стиль и чистая структура",
    prompt: "Оформи претензию делово и структурно: шапка, суть нарушения, требования, срок ответа.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  },
  {
    title: "Сравнение документов",
    desc: "Ключевые расхождения двух редакций",
    prompt: "Сравни две редакции договора и выдели ключевые расхождения в обязательствах сторон.",
    icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
];

export default function CommandDeck() {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [horizontal, setHorizontal] = useState(false);
  const [progress, setProgress] = useState(0);

  // Режим: горизонтальный пан только на широком экране с точным указателем и без
  // «уменьшить движение». Иначе — вертикальная стопка (SSR тоже рендерит стопку).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setHorizontal(mq.matches && !rm.matches);
    update();
    mq.addEventListener("change", update);
    rm.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      rm.removeEventListener("change", update);
    };
  }, []);

  // Привязка горизонтального сдвига трека к прогрессу вертикального скролла секции.
  useEffect(() => {
    if (!horizontal) return;
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const total = outer.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-outer.getBoundingClientRect().top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      const maxX = track.scrollWidth - window.innerWidth;
      track.style.transform = `translate3d(${-p * maxX}px,0,0)`;
      setProgress(p);
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
  }, [horizontal]);

  // Клик по карточке: панимся к чату (или скроллим к нему в стопке) и шлём запрос.
  const onCard = (prompt: string) => {
    if (horizontal && outerRef.current) {
      const outer = outerRef.current;
      window.scrollTo({
        top: outer.offsetTop + (outer.offsetHeight - window.innerHeight),
        behavior: "smooth",
      });
    } else {
      document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent("demo:ask", { detail: prompt })),
      horizontal ? 750 : 550,
    );
  };

  // Панель карточек (общая для обоих режимов). onArrow — показывать ли «→ живое демо».
  const cardsInner = (showArrow: boolean) => (
    <div className="w-full max-w-6xl mx-auto px-6">
      <div className="mb-8 md:mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-[13px] text-[#e6e6e6]/40 mb-4">готовые команды</p>
          <h2
            className="font-normal text-[28px] md:text-[40px] leading-[1.06] tracking-[-0.02em] text-[#f4f2ec]"
            style={{ fontFamily: HELV, textTransform: "none" }}
          >
            Рутина юриста — на автопилоте
          </h2>
          <p className="text-[15px] md:text-[16px] leading-relaxed text-[#e6e6e6]/50 mt-3 max-w-md">
            Нажмите на задачу — AI разберёт её прямо в живом демо.
          </p>
        </div>
        {showArrow && (
          <div className="hidden lg:flex items-center gap-2 text-[13px] text-[#e6e6e6]/40 whitespace-nowrap pb-1">
            листайте
            <span aria-hidden className="text-cyber-blue">→</span>
            живое демо
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {COMMANDS.map((c) => (
          <button
            key={c.title}
            onClick={() => onCard(c.prompt)}
            className="group text-left rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5 transition-all duration-300 hover:border-cyber-blue/40 hover:bg-cyber-blue/[0.04] hover:-translate-y-0.5 hover:shadow-[0_0_34px_-8px_rgba(0,207,255,0.3)] cursor-pointer flex flex-col"
            style={{ fontFamily: HELV }}
          >
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg border border-cyber-blue/25 bg-cyber-blue/[0.06] text-cyber-blue/80 mb-4 group-hover:text-cyber-blue group-hover:border-cyber-blue/50 transition-colors">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.icon} />
              </svg>
            </span>
            <span className="text-[15px] md:text-[16px] leading-snug text-[#f4f2ec] mb-1 group-hover:text-cyber-blue transition-colors">
              {c.title}
            </span>
            <span className="text-[13px] leading-relaxed text-[#e6e6e6]/45 flex-1">{c.desc}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[#e6e6e6]/40 group-hover:text-cyber-blue transition-colors">
              Попробовать
              <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Fallback: вертикальная стопка (тач / узкий экран / reduced-motion) ──
  if (!horizontal) {
    return (
      <>
        <section className="relative overflow-hidden py-16 md:py-24 bg-[#070a10] text-[#e6e6e6]">
          <div aria-hidden className="absolute -top-20 left-1/4 w-[420px] h-[420px] rounded-full bg-cyber-blue/[0.06] blur-[140px] pointer-events-none" />
          <div className="relative">{cardsInner(false)}</div>
        </section>
        <section className="pb-16 md:pb-24 bg-[#070a10]">
          <LiveDemo />
        </section>
      </>
    );
  }

  // ── Десктоп: pinned horizontal scroll ──
  return (
    <section ref={outerRef} className="relative bg-[#070a10] h-[240vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Циан-свет платформы — ambient-свечения */}
        <div aria-hidden className="absolute top-1/4 -left-40 w-[620px] h-[620px] rounded-full bg-cyber-blue/[0.07] blur-[150px] pointer-events-none" />
        <div aria-hidden className="absolute -bottom-20 right-1/4 w-[520px] h-[520px] rounded-full bg-cyber-blue/[0.05] blur-[150px] pointer-events-none" />
        <div ref={trackRef} className="relative flex h-full will-change-transform">
          <div className="w-screen h-full shrink-0 flex items-center">{cardsInner(true)}</div>
          <div className="w-screen h-full shrink-0">
            <LiveDemo embedded />
          </div>
        </div>

        {/* Прогресс-линия раскрытия — тонкий циан-намёк вместо слов */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-cyber-blue/50" style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}
