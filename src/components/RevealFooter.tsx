import HomeFooter from "./HomeFooter";

// FILE: src/components/RevealFooter.tsx
// VERSION: 3.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Монтирует тёмный editorial-футер главной ПОД контентом в обычном потоке.
// SCOPE: обёртка секций главной + <HomeFooter/> статично снизу.
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему убран прежний «reveal» через position:fixed (контент уезжал, открывая
//    зафиксированный внизу футер)?
// A: Эффект давал баг: при СКРОЛЛЕ гигантский вордмарк fixed-футера (высотой почти во
//    весь экран) просвечивал сквозь полупрозрачные секции — compositing/repaint fixed-слоя
//    + параллакс + will-change рассинхронивались с контентом во время прокрутки. Статично
//    враппер контента полностью перекрывал футер, но во время скролла — нет. Фикс: футер в
//    нормальном потоке, без fixed/параллакса — просвечивание невозможно by construction.
//    Тёмный фон футера (#06080d) бесшовно сливается с navy-900 контента.
// END_RATIONALE
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v3.0.0 - Убран fixed-reveal (баг просвечивания вордмарка при скролле) → статичный футер]
// PREV_CHANGE_SUMMARY: [v2.0.0 - Драматизированный reveal через position:fixed + параллакс]
// END_CHANGE_SUMMARY

export default function RevealFooter({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HomeFooter />
    </>
  );
}
