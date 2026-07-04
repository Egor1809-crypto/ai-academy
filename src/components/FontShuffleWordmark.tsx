"use client";

import { useEffect, useRef, useState } from "react";
import { SHUFFLE_FONTS } from "@/lib/shuffleFonts";

// FILE: src/components/FontShuffleWordmark.tsx
// PURPOSE: Живой типографический вордмарк «AI. LEGAL» слева в чат-панели.
//   «AI.» — жирный белый, статичный. «LEGAL» — перебирает шрифты (~17) и СВЕТИТСЯ циан
//   (наш фирменный голубой свет). Рядом слоган, меняющий шрифт И РАЗМЕР весомо.
//   Перебор идёт ВСЕГДА, пока вордмарк на экране (не только при печати) — быстрее при
//   вводе в чате. Наведение/клик — стоп-кадр. Пауза, когда вне экрана (IntersectionObserver).
// LANGUAGE: reframed.online (живая типографика) × наш циан-свет платформы.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Вдохновляющие слоганы — по числу шрифтов. Про рост юриста, скорость, преимущество.
const SLOGANS = [
  "юрист будущего",
  "твоё преимущество",
  "работай умнее",
  "часы в минуты",
  "на шаг впереди",
  "выше конкурентов",
  "право нового времени",
  "освободи время",
  "успевай больше",
  "сила в скорости",
  "мастер своего дела",
  "новый стандарт",
  "будущее уже здесь",
  "незаменимый эксперт",
  "сложное — просто",
  "владей будущим",
  "думай стратегически",
];

// Весомо разные размеры (px) — от мелкого до крупного.
const SIZES = [20, 32, 48, 64, 82, 28, 42, 60, 74];

const rnd = (n: number) => Math.floor(Math.random() * n);

export default function FontShuffleWordmark({ active }: { active: boolean }) {
  const [legalFont, setLegalFont] = useState(12); // старт: Unbounded
  const [slogan, setSlogan] = useState({ i: 11, font: 3, size: 4 });
  const [hovering, setHovering] = useState(false);
  const [locked, setLocked] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Пауза перебора, когда вордмарк вне экрана — не крутим таймеры зря.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frozen = hovering || locked;
  const running = visible && !frozen && !reduce;

  useEffect(() => {
    if (!running) return;
    // Живёт всегда, но при вводе в чате — заметно энергичнее.
    const legalMs = active ? 110 : 360;
    const slogMs = active ? 620 : 1300;
    const legal = window.setInterval(() => setLegalFont(rnd(SHUFFLE_FONTS.length)), legalMs);
    const slog = window.setInterval(
      () => setSlogan({ i: rnd(SLOGANS.length), font: rnd(SHUFFLE_FONTS.length), size: rnd(SIZES.length) }),
      slogMs,
    );
    return () => {
      window.clearInterval(legal);
      window.clearInterval(slog);
    };
  }, [running, active]);

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => setLocked((l) => !l)}
      className="relative select-none cursor-pointer"
      title={locked ? "клик — снять стоп-кадр" : "наведи или кликни — замрёт"}
    >
      {/* Циан-свечение платформы за вордмарком */}
      <div
        aria-hidden
        className="absolute -left-10 top-4 w-[360px] h-[360px] rounded-full bg-cyber-blue/[0.14] blur-[90px] pointer-events-none"
      />

      <div className="relative tracking-[-0.02em]">
        {/* AI. — статичный, белый, среднего кегля */}
        <div
          className="text-white leading-none"
          style={{ fontFamily: HELV, fontWeight: 900, fontSize: "clamp(30px, 3.2vw, 52px)" }}
        >
          AI.
        </div>
        {/* LEGAL — огромный, перебор шрифтов, светится циан */}
        <div
          className="text-white leading-[0.95] mt-1"
          style={{
            fontFamily: SHUFFLE_FONTS[legalFont],
            fontSize: "clamp(58px, 7.4vw, 116px)",
            textShadow: "0 0 48px rgba(0,207,255,0.55), 0 0 14px rgba(0,207,255,0.35)",
          }}
        >
          LEGAL
        </div>
      </div>

      {/* Слоган — шрифт и РАЗМЕР меняются весомо, циан-свет */}
      <div className="relative mt-7 min-h-[96px] flex items-center overflow-visible">
        <span
          className="text-cyber-blue leading-none"
          style={{
            fontFamily: SHUFFLE_FONTS[slogan.font],
            fontSize: `${SIZES[slogan.size]}px`,
            textShadow: "0 0 30px rgba(0,207,255,0.4)",
          }}
        >
          {SLOGANS[slogan.i]}
        </span>
      </div>

      <p className="relative mt-6 text-[12px] text-[#e6e6e6]/35" style={{ fontFamily: HELV }}>
        {locked ? "стоп-кадр — кликни, чтобы отпустить" : "наведи на слово — замрёт · печатай в чате — ускорится"}
      </p>
    </div>
  );
}
