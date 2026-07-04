"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SHUFFLE_FONTS } from "@/lib/shuffleFonts";

// FILE: src/components/FontShuffleWordmark.tsx
// PURPOSE: Живой типографический вордмарк «AI. LEGAL» слева в чат-панели.
//   «AI.» — жирный белый, статичный. «LEGAL» — перебор шрифтов (~17), светится циан.
//   Слоган меняет шрифт И размер весомо. Перебор идёт всегда, пока вордмарк на экране.
//   Наведение/клик — стоп-кадр.
//   ВАЖНО: measure-fit — LEGAL и слоган масштабируются под ширину колонки (любой шрифт/
//   размер вписывается, НЕ наезжает на чат). Буквы pointer-events:none, чтобы невидимый
//   layout-бокс не перехватывал клики по чату; клик/hover ловит корневой div.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

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

const SIZES = [20, 32, 48, 64, 82, 28, 42, 60, 74];

const rnd = (n: number) => Math.floor(Math.random() * n);

// useLayoutEffect на клиенте, useEffect на сервере — без SSR-варнинга.
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function FontShuffleWordmark({ active }: { active: boolean }) {
  const [legalFont, setLegalFont] = useState(12);
  const [slogan, setSlogan] = useState({ i: 0, font: 3, size: 4 });
  const [hovering, setHovering] = useState(false);
  const [locked, setLocked] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [visible, setVisible] = useState(false);
  const [legalScale, setLegalScale] = useState(1);
  const [sloganScale, setSloganScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const legalRef = useRef<HTMLSpanElement>(null);
  const sloganRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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
    const legalMs = active ? 110 : 360;
    const slogMs = active ? 620 : 1300;
    const l = window.setInterval(() => setLegalFont(rnd(SHUFFLE_FONTS.length)), legalMs);
    const s = window.setInterval(
      () => setSlogan({ i: rnd(SLOGANS.length), font: rnd(SHUFFLE_FONTS.length), size: rnd(SIZES.length) }),
      slogMs,
    );
    return () => {
      window.clearInterval(l);
      window.clearInterval(s);
    };
  }, [running, active]);

  // Measure-fit: вписать текст в ширину колонки (offsetWidth не зависит от transform).
  useIsoLayout(() => {
    const el = legalRef.current;
    const cont = el?.parentElement;
    if (!el || !cont) return;
    const avail = cont.clientWidth;
    const w = el.offsetWidth;
    setLegalScale(avail > 0 && w > avail ? avail / w : 1);
  }, [legalFont]);

  useIsoLayout(() => {
    const el = sloganRef.current;
    const cont = el?.parentElement;
    if (!el || !cont) return;
    const avail = cont.clientWidth;
    const w = el.offsetWidth;
    setSloganScale(avail > 0 && w > avail ? avail / w : 1);
  }, [slogan]);

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => setLocked((v) => !v)}
      className="relative select-none cursor-pointer"
      title={locked ? "клик — снять стоп-кадр" : "наведи или кликни — замрёт"}
    >
      {/* Циан-свечение платформы за вордмарком */}
      <div
        aria-hidden
        className="absolute -left-10 top-4 w-[360px] h-[360px] rounded-full bg-cyber-blue/[0.14] blur-[90px] pointer-events-none"
      />

      <div className="relative tracking-[-0.02em]">
        {/* AI. — статичный, белый */}
        <div
          className="text-white leading-none"
          style={{ fontFamily: HELV, fontWeight: 900, fontSize: "clamp(30px, 3.2vw, 52px)" }}
        >
          AI.
        </div>
        {/* LEGAL — перебор шрифтов, светится циан, вписан в колонку */}
        <span
          ref={legalRef}
          className="block w-fit mt-1 text-white leading-[0.95] pointer-events-none"
          style={{
            fontFamily: SHUFFLE_FONTS[legalFont],
            fontSize: "clamp(56px, 7vw, 104px)",
            textShadow: "0 0 48px rgba(0,207,255,0.55), 0 0 14px rgba(0,207,255,0.35)",
            whiteSpace: "nowrap",
            transform: `scale(${legalScale})`,
            transformOrigin: "left center",
          }}
        >
          LEGAL
        </span>
      </div>

      {/* Слоган — шрифт и размер меняются весомо, тоже вписан в колонку */}
      <div className="relative mt-7 min-h-[92px] flex items-center">
        <span
          ref={sloganRef}
          className="inline-block text-cyber-blue leading-none pointer-events-none"
          style={{
            fontFamily: SHUFFLE_FONTS[slogan.font],
            fontSize: `${SIZES[slogan.size]}px`,
            textShadow: "0 0 30px rgba(0,207,255,0.4)",
            whiteSpace: "nowrap",
            transform: `scale(${sloganScale})`,
            transformOrigin: "left center",
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
