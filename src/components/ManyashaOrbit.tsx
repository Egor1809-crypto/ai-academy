"use client";

/**
 * HUD-кольцо вокруг Маняши. Рендерится ВНУТРИ обёртки маскота, поэтому его
 * центр всегда совпадает с центром Маняши (она строго в середине круга).
 *
 * Намеренно компактное (w-[68%]) — кольцо не должно выходить за нижнюю синюю
 * линию секции и должно «обтекаться» плавающими панелями (они выше по z-index).
 * Радар-развёртку и быстро вращающийся «средний» круг убрали — лишний шум.
 */
export default function ManyashaOrbit() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] aspect-square">
        {/* Внешнее кольцо — жирное, заметное */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/35 shadow-[0_0_40px_rgba(0,207,255,0.12)_inset]" />

        {/* Тонкое внутреннее кольцо для глубины */}
        <div className="absolute inset-[14%] rounded-full border border-cyan-400/18" />

        {/* Перекрестие-направляющие */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/12 to-transparent" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-400/12 to-transparent" />

        {/* Орбитальные узлы по внешнему кольцу */}
        <div className="absolute inset-0" style={{ animation: "orbit-spin 22s linear infinite" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-300 rounded-full shadow-[0_0_16px_rgba(0,207,255,0.9)]" />
        </div>
        <div className="absolute inset-0" style={{ animation: "orbit-spin 22s linear infinite reverse" }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-[0_0_14px_rgba(168,85,247,0.9)]" />
        </div>
        <div className="absolute inset-0" style={{ animation: "orbit-spin 30s linear infinite" }}>
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-gold rounded-full shadow-[0_0_12px_rgba(245,197,24,0.8)]" />
        </div>
      </div>
    </div>
  );
}
