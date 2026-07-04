"use client";

import { useEffect, useRef, useState } from "react";
import Footer from "./Footer";

// FILE: src/components/RevealFooter.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Эффект «спуска на футер» (как на malvah.co) — только для главной. Контент
//   страницы едет вверх непрозрачным фоном поверх зафиксированного внизу футера и
//   «открывает» его на последних пикселях прокрутки, как поднимающаяся шторка.
// SCOPE: Обёртка контента главной; сам футер (полный Footer) фиксируется внизу.
// INPUT: children — секции главной страницы.
// OUTPUT: JSX (обёртка контента + fixed-футер).
// KEYWORDS: DOMAIN(6): UX; CONCEPT(8): StickyRevealFooter; TECH(7): React, ResizeObserver
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему footer position:fixed z-0, а контент relative z-10 с непрозрачным фоном и
//    marginBottom = высоте футера?
// A: Fixed-футер всегда у низа вьюпорта, но перекрыт контентом (выше по z и с solid-фоном).
//    marginBottom резервирует прокрутку ровно на высоту футера — на последних пикселях
//    контент уезжает вверх и из-под него проявляется футер. Высота футера адаптивна →
//    измеряем ResizeObserver'ом и подставляем в marginBottom.
// END_RATIONALE

export default function RevealFooter({ children }: { children: React.ReactNode }) {
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const measure = () => setFooterHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      {/* Контент главной: непрозрачный фон + z выше футера + резерв прокрутки снизу */}
      <div className="relative z-10 bg-navy-900" style={{ marginBottom: footerHeight }}>
        {children}
      </div>

      {/* Футер зафиксирован внизу за контентом — «проявляется» на спуске */}
      <div ref={footerRef} className="fixed bottom-0 left-0 w-full z-0">
        <Footer />
      </div>
    </>
  );
}
