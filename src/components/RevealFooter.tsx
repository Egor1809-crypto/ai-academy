"use client";

import { useEffect, useRef, useState } from "react";
import HomeFooter from "./HomeFooter";

// FILE: src/components/RevealFooter.tsx
// VERSION: 2.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Эффект «спуска на футер» (как на malvah.co) для главной. Контент — панель с
//   закруглённым низом и крупной тенью — приподнимается вверх, а из-под неё с параллаксом
//   и проявлением выезжает зафиксированный внизу футер. Ощущение поднимающейся шторки.
// SCOPE: Обёртка контента главной; сам футер (полный Footer) фиксируется внизу.
// INPUT: children — секции главной страницы.
// OUTPUT: JSX (панель контента + fixed-футер с параллаксом).
// KEYWORDS: DOMAIN(7): UX; CONCEPT(9): StickyRevealFooter+Parallax; TECH(8): React, rAF
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему панель контента с rounded-b + overflow-hidden + большой тенью, а параллакс —
//    на ВНУТРЕННЕМ содержимом футера, а не на контейнере?
// A: rounded-b+overflow-hidden делают контент «карточкой», которая визуально отрывается и
//    открывает футер (тень усиливает подъём). Ни один компонент не использует position:sticky,
//    поэтому overflow-hidden безопасен. Параллакс на inner (translateY+opacity по прогрессу
//    раскрытия) даёт «сочную» глубину; контейнер футера overflow-hidden клипует этот сдвиг.
//    На контенте НЕ ставим transform/will-change — иначе fixed-кнопка Telegram привязалась бы
//    к обёртке, а не к вьюпорту. Уважаем prefers-reduced-motion (параллакс отключается).
// END_RATIONALE
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v2.0.0 - Драматизирован эффект: rounded-панель+тень+скролл-параллакс футера]
// PREV_CHANGE_SUMMARY: [v1.0.0 - Простая fixed-шторка без визуальных акцентов]
// END_CHANGE_SUMMARY

export default function RevealFooter({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  // Измеряем высоту футера — на неё резервируем прокрутку (marginBottom контента).
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const measure = () => setFooterHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Параллакс раскрытия: по мере того как низ контента уходит выше низа вьюпорта,
  // содержимое футера выезжает снизу вверх и проявляется.
  useEffect(() => {
    const content = contentRef.current;
    const footer = footerRef.current;
    const inner = innerRef.current;
    if (!content || !footer || !inner) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const h = footer.offsetHeight || 1;
      // revealed: 0 (футер скрыт) → h (футер полностью открыт)
      const revealed = Math.min(
        Math.max(window.innerHeight - content.getBoundingClientRect().bottom, 0),
        h,
      );
      const p = revealed / h; // прогресс раскрытия 0..1
      if (reduce) {
        inner.style.transform = "";
        inner.style.opacity = "";
        return;
      }
      inner.style.transform = `translate3d(0, ${(1 - p) * 48}px, 0)`;
      inner.style.opacity = String(0.55 + 0.45 * p);
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
  }, [footerHeight]);

  return (
    <>
      {/* Панель контента: закруглённый низ + тень + резерв прокрутки. БЕЗ transform/
          will-change — чтобы fixed-элементы внутри (Telegram-кнопка) держались за вьюпорт. */}
      <div
        ref={contentRef}
        className="relative z-10 bg-navy-900 rounded-b-[24px] md:rounded-b-[40px] overflow-hidden shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]"
        style={{ marginBottom: footerHeight }}
      >
        {children}
      </div>

      {/* Светлый editorial-футер зафиксирован внизу за контентом. Никаких подсветок —
          «спуск» читается контрастом: тёмный контент уезжает вверх, открывая светлый футер.
          overflow-hidden клипует параллакс inner. */}
      <div ref={footerRef} className="fixed bottom-0 left-0 w-full z-0 overflow-hidden">
        <div ref={innerRef} className="will-change-transform">
          <HomeFooter />
        </div>
      </div>
    </>
  );
}
