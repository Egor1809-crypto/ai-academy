"use client";

export default function ManyashaEffects() {
  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden>
      {/* ── Orbiting ring ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] aspect-square">
        <div
          className="absolute inset-0 rounded-full border border-cyan-400/15"
          style={{ animation: "orbit-spin 20s linear infinite" }}
        />
        {/* Orbiting dot 1 */}
        <div
          className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(0,207,255,0.7)]"
          style={{
            top: "0%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "orbit-spin 20s linear infinite",
          }}
        />
        {/* Orbiting dot 2 (opposite side, slower) */}
        <div
          className="absolute w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.7)]"
          style={{
            bottom: "0%",
            left: "50%",
            transform: "translate(-50%, 50%)",
            animation: "orbit-spin 20s linear infinite reverse",
          }}
        />
      </div>

      {/* ── Second orbit ring (tilted via perspective) ── */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square"
        style={{ transform: "translate(-50%, -50%) rotateX(60deg)" }}
      >
        <div
          className="absolute inset-0 rounded-full border border-purple-500/10"
          style={{ animation: "orbit-spin 15s linear infinite reverse" }}
        />
      </div>

      {/* ── Floating tech labels (like ChainGPT) ── */}

      {/* Top-right label */}
      <div
        className="absolute top-[8%] right-[8%] flex items-center gap-2"
        style={{ animation: "label-float 6s ease-in-out infinite" }}
      >
        <div className="w-10 h-[1.5px] bg-gradient-to-r from-transparent to-cyan-400/50" />
        <div className="bg-navy-800/80 border border-cyan-400/20 backdrop-blur-sm px-4 py-2 rounded-md">
          <p className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider font-semibold">AI-анализ</p>
          <p className="text-xs font-mono text-gray-400">договоров</p>
        </div>
      </div>

      {/* Right-middle label */}
      <div
        className="absolute top-[38%] right-[3%] flex items-center gap-2"
        style={{ animation: "label-float 7s ease-in-out infinite 1s" }}
      >
        <div className="w-14 h-[1.5px] bg-gradient-to-r from-transparent to-purple-400/40" />
        <div className="bg-navy-800/80 border border-purple-400/20 backdrop-blur-sm px-4 py-2 rounded-md">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <p className="text-xs font-mono text-green-400/80 uppercase font-semibold">Online</p>
          </div>
          <p className="text-xs font-mono text-gray-400">Нейросеть</p>
        </div>
      </div>

      {/* Bottom-right label */}
      <div
        className="absolute bottom-[22%] right-[10%] flex items-center gap-2"
        style={{ animation: "label-float 5s ease-in-out infinite 2s" }}
      >
        <div className="w-8 h-[1.5px] bg-gradient-to-r from-transparent to-cyan-400/30" />
        <div className="bg-navy-800/80 border border-white/10 backdrop-blur-sm px-4 py-2 rounded-md">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider font-semibold">Legal Design</p>
        </div>
      </div>

      {/* Left-side label */}
      <div
        className="absolute top-[20%] left-[3%] flex items-center gap-2 flex-row-reverse"
        style={{ animation: "label-float 8s ease-in-out infinite 0.5s" }}
      >
        <div className="w-12 h-[1.5px] bg-gradient-to-l from-transparent to-cyan-400/30" />
        <div className="bg-navy-800/80 border border-cyan-400/15 backdrop-blur-sm px-4 py-2 rounded-md">
          <p className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider font-semibold">Промпты</p>
          <p className="text-xs font-mono text-gray-400">для юристов</p>
        </div>
      </div>

      {/* Bottom-left label */}
      <div
        className="absolute bottom-[15%] left-[8%] flex items-center gap-2 flex-row-reverse"
        style={{ animation: "label-float 6.5s ease-in-out infinite 3s" }}
      >
        <div className="w-8 h-[1.5px] bg-gradient-to-l from-transparent to-purple-400/30" />
        <div className="bg-navy-800/80 border border-purple-400/15 backdrop-blur-sm px-4 py-2 rounded-md">
          <p className="text-xs font-mono text-purple-400/70 uppercase tracking-wider font-semibold">Due Diligence</p>
        </div>
      </div>

      {/* ── Connection lines (animated dashes) ── */}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Top-left to center */}
        <line
          x1="15" y1="20" x2="45" y2="45"
          stroke="url(#line-grad-cyan)" strokeWidth="0.15"
          strokeDasharray="2 3"
          style={{ animation: "dash-flow 4s linear infinite" }}
        />
        {/* Right to center */}
        <line
          x1="90" y1="35" x2="60" y2="48"
          stroke="url(#line-grad-purple)" strokeWidth="0.15"
          strokeDasharray="2 3"
          style={{ animation: "dash-flow 5s linear infinite reverse" }}
        />
        {/* Bottom-right to center */}
        <line
          x1="85" y1="80" x2="58" y2="55"
          stroke="url(#line-grad-cyan)" strokeWidth="0.12"
          strokeDasharray="1.5 4"
          style={{ animation: "dash-flow 6s linear infinite" }}
        />
        <defs>
          <linearGradient id="line-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,207,255,0)" />
            <stop offset="50%" stopColor="rgba(0,207,255,0.4)" />
            <stop offset="100%" stopColor="rgba(0,207,255,0)" />
          </linearGradient>
          <linearGradient id="line-grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168,85,247,0)" />
            <stop offset="50%" stopColor="rgba(168,85,247,0.3)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Floating particles/stars ── */}
      <div
        className="absolute top-[15%] left-[20%] w-1 h-1 bg-cyan-400/60 rounded-full"
        style={{ animation: "twinkle 3s ease-in-out infinite" }}
      />
      <div
        className="absolute top-[60%] right-[15%] w-1.5 h-1.5 bg-purple-400/40 rounded-full"
        style={{ animation: "twinkle 4s ease-in-out infinite 1s" }}
      />
      <div
        className="absolute bottom-[25%] left-[15%] w-1 h-1 bg-cyan-300/50 rounded-full"
        style={{ animation: "twinkle 5s ease-in-out infinite 2s" }}
      />
      <div
        className="absolute top-[45%] right-[25%] w-0.5 h-0.5 bg-white/40 rounded-full"
        style={{ animation: "twinkle 3.5s ease-in-out infinite 0.5s" }}
      />
      <div
        className="absolute top-[70%] left-[35%] w-1 h-1 bg-gold/40 rounded-full"
        style={{ animation: "twinkle 4.5s ease-in-out infinite 1.5s" }}
      />

      {/* ── Hex / scan overlay at bottom ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-cyan-400/[0.02] to-transparent" />

      {/* ── Corner brackets (HUD style) ── */}
      <div className="absolute top-[5%] left-[5%] w-8 h-8 border-t border-l border-cyan-400/25" />
      <div className="absolute top-[5%] right-[5%] w-8 h-8 border-t border-r border-cyan-400/25" />
      <div className="absolute bottom-[5%] left-[5%] w-8 h-8 border-b border-l border-cyan-400/25" />
      <div className="absolute bottom-[5%] right-[5%] w-8 h-8 border-b border-r border-cyan-400/25" />
    </div>
  );
}
