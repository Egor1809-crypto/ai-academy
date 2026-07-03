/**
 * Собирающаяся ракета для страницы программы: по мере прохождения модулей
 * (active 0→total-1) деталь за деталью появляется ракета — двигатель → корпус →
 * крылья → носовой конус; на последнем модуле включается пламя («к запуску»).
 * Метафора: маршрут курса = сборка ракеты, финал = взлёт.
 *
 * Чистый SVG на пропсах (без хуков), цвет-акцент берётся из активного модуля.
 */
import type { CSSProperties } from "react";

interface RocketAssemblyProps {
  active: number;
  total: number;
  hex: string;
}

const partStyle = (show: boolean, delay = 0): CSSProperties => ({
  opacity: show ? 1 : 0,
  transform: show ? "translateY(0)" : "translateY(14px)",
  transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
});

export default function RocketAssembly({ active, total, hex }: RocketAssemblyProps) {
  const complete = active >= total - 1;
  const built = Math.min(active + 1, total);

  return (
    <div className="relative select-none">
      {/* Заголовок-индикатор сборки */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
          Сборка
        </span>
        <span className="text-[11px] font-mono tabular-nums text-gray-500">
          <span style={{ color: hex }}>{String(built).padStart(2, "0")}</span>
          <span className="text-gray-600"> / {String(total).padStart(2, "0")}</span>
        </span>
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
        <span className="hud-corner-tl" />
        <span className="hud-corner-br" />
        {/* лёгкое свечение под ракетой */}
        <div
          className="absolute left-1/2 bottom-6 -translate-x-1/2 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-opacity duration-700"
          style={{ background: hex, opacity: complete ? 0.22 : 0.08 }}
        />

        <svg viewBox="0 0 140 320" fill="none" className="w-full h-auto max-h-[440px] mx-auto relative z-10">
          <defs>
            <linearGradient id="rk-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0a1628" />
              <stop offset="45%" stopColor="#16263f" />
              <stop offset="100%" stopColor="#0a1628" />
            </linearGradient>
            <linearGradient id="rk-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#70EFFF" />
              <stop offset="100%" stopColor="#00CFFF" />
            </linearGradient>
            <linearGradient id="rk-flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#70EFFF" />
              <stop offset="45%" stopColor="#00CFFF" />
              <stop offset="100%" stopColor="#FF007A" />
            </linearGradient>
          </defs>

          {/* Пламя (только когда собрано) */}
          <g style={{ ...partStyle(complete), transformOrigin: "70px 250px" }}>
            <path
              d="M58 250 C 58 275, 66 288, 70 306 C 74 288, 82 275, 82 250 Z"
              fill="url(#rk-flame)"
              opacity="0.9"
              style={{ transformOrigin: "70px 250px", animation: complete ? "pulse-glow 1.1s ease-in-out infinite" : undefined }}
            />
            <path d="M64 250 C 64 268, 68 278, 70 292 C 72 278, 76 268, 76 250 Z" fill="#fff" opacity="0.55" />
          </g>

          {/* 1 — Двигатель / сопло (active >= 0) */}
          <g style={partStyle(active >= 0)}>
            <path d="M54 232 L86 232 L94 252 L46 252 Z" fill="url(#rk-body)" stroke="url(#rk-line)" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M56 240 H84" stroke="url(#rk-line)" strokeWidth="1" opacity="0.5" />
          </g>

          {/* 2 — Корпус (active >= 1) */}
          <g style={partStyle(active >= 1)}>
            <path d="M50 232 L50 120 Q50 108 70 100 Q90 108 90 120 L90 232 Z" fill="url(#rk-body)" stroke="url(#rk-line)" strokeWidth="1.6" strokeLinejoin="round" />
            {/* иллюминатор */}
            <circle cx="70" cy="150" r="13" fill="#050d1a" stroke="url(#rk-line)" strokeWidth="1.6" />
            <circle cx="70" cy="150" r="7" fill={hex} opacity="0.35" />
            {/* поясок */}
            <path d="M50 200 H90" stroke="url(#rk-line)" strokeWidth="1" opacity="0.4" />
          </g>

          {/* 3 — Крылья (active >= 2) */}
          <g style={partStyle(active >= 2)}>
            <path d="M50 196 L28 240 L50 232 Z" fill="url(#rk-body)" stroke="url(#rk-line)" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M90 196 L112 240 L90 232 Z" fill="url(#rk-body)" stroke="url(#rk-line)" strokeWidth="1.6" strokeLinejoin="round" />
          </g>

          {/* 4 — Носовой конус (active >= 3) */}
          <g style={partStyle(active >= 3)}>
            <path d="M70 100 Q50 112 50 120 Q64 92 70 60 Q76 92 90 120 Q90 112 70 100 Z" fill="url(#rk-body)" stroke="url(#rk-line)" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M70 60 L70 100" stroke="url(#rk-line)" strokeWidth="1" opacity="0.4" />
            {/* маячок */}
            <circle cx="70" cy="62" r="2.6" fill={hex} />
          </g>

          {/* пусковая площадка */}
          <path d="M20 252 H120" stroke="url(#rk-line)" strokeWidth="1" opacity="0.25" />
        </svg>
      </div>

      {/* Подпись-статус */}
      <div className="mt-3 text-center">
        {complete ? (
          <span className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: hex }}>
            ▲ Готов к запуску
          </span>
        ) : (
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-600">
            Следующий модуль → +1 деталь
          </span>
        )}
      </div>
    </div>
  );
}
