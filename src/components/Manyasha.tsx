"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTTS } from "@/hooks/useTTS";

export interface ManyashaPage {
  label: string;
  href: string;
  speech: string;
}

export interface ManyashaProps {
  size?: "sm" | "md" | "lg" | "hero";
  pages?: ManyashaPage[];
  idleSpeech?: string;
  hoverSpeech?: string;
  position?: "inline" | "fixed-right" | "fixed-left";
  className?: string;
}

type MascotState = "idle" | "active";

const SIZE_CLASSES = {
  sm: "w-[200px]",
  md: "w-[300px]",
  lg: "w-[420px]",
  hero: "w-full",
};

export default function Manyasha({
  size = "md",
  pages,
  idleSpeech,
  hoverSpeech = "Привет! Я Маняша — твой AI-помощник!",
  position = "inline",
  className = "",
}: ManyashaProps) {
  const idleRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<MascotState>("idle");
  const [speech, setSpeech] = useState<string | null>(idleSpeech ?? null);
  const [showGuide, setShowGuide] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [hasGreeted, setHasGreeted] = useState(false);
  const { speak, stop } = useTTS();
  const router = useRouter();
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force autoplay on mount
  useEffect(() => {
    idleRef.current?.play().catch(() => {});
  }, []);

  // Play/pause videos based on state
  useEffect(() => {
    if (state === "idle") {
      idleRef.current?.play().catch(() => {});
      if (activeRef.current) {
        activeRef.current.pause();
        activeRef.current.currentTime = 0;
      }
    } else {
      if (idleRef.current) idleRef.current.pause();
      if (activeRef.current) {
        activeRef.current.currentTime = 0;
        activeRef.current.play().catch(() => {});
      }
    }
  }, [state]);

  // Typewriter effect
  useEffect(() => {
    if (!speech) {
      setDisplayedText("");
      return;
    }
    setDisplayedText("");
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedText(speech.slice(0, idx));
      if (idx >= speech.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [speech]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (state === "idle") {
        setState("active");
        setSpeech(hoverSpeech);
        if (!hasGreeted) {
          speak(hoverSpeech);
          setHasGreeted(true);
        }
      }
    }, 120);
  }, [state, hoverSpeech, hasGreeted, speak]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!showGuide) {
      setState("idle");
      setSpeech(idleSpeech ?? null);
      stop();
    }
  }, [showGuide, idleSpeech, stop]);

  const handleClick = useCallback(() => {
    if (!pages || pages.length === 0) return;
    setShowGuide((prev) => {
      if (!prev) {
        const msg = "Куда хотите перейти?";
        setSpeech(msg);
        speak(msg);
        setState("active");
      } else {
        setSpeech(idleSpeech ?? null);
        stop();
        setState("idle");
      }
      return !prev;
    });
  }, [pages, idleSpeech, speak, stop]);

  const handlePageClick = useCallback(
    (page: ManyashaPage) => {
      setSpeech(page.speech);
      speak(page.speech);
      setShowGuide(false);
      setTimeout(() => {
        router.push(page.href);
      }, 2000);
    },
    [speak, router],
  );

  const positionClasses =
    position === "fixed-right"
      ? "fixed bottom-6 right-6 z-50"
      : position === "fixed-left"
        ? "fixed bottom-6 left-6 z-50"
        : "";

  const isFixed = position === "fixed-right" || position === "fixed-left";

  return (
    <div className={`${positionClasses} ${className}`}>
      <div className="relative inline-block" style={{ overflow: "visible" }}>
        {/* Speech bubble */}
        {speech && displayedText && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none ${
              isFixed
                ? "bottom-full mb-3 max-w-[220px]"
                : "-top-4 -translate-y-full max-w-[300px]"
            }`}
            style={{ animation: "fadeIn 0.3s ease-out" }}
          >
            <div className="bg-navy-800/95 border border-gold/30 backdrop-blur-md px-4 py-3 text-sm text-gray-200 leading-relaxed rounded-xl shadow-xl shadow-black/20">
              {displayedText}
              {displayedText.length < (speech?.length ?? 0) && (
                <span className="animate-pulse text-gold ml-0.5">▋</span>
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-navy-800/95 border-r border-b border-gold/30 rotate-45" />
          </div>
        )}

        {/* Video mascot — two videos, toggle visibility */}
        <div
          className={`${SIZE_CLASSES[size]} cursor-pointer transition-transform duration-300 hover:scale-[1.03] relative`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <video
            ref={idleRef}
            src="/mascot/manyasha-idle-alpha.webm"
            poster="/mascot/manyasha-idle-poster.jpg"
            loop
            muted
            playsInline
            autoPlay
            preload="auto"
            className={`w-full h-auto ${state === "idle" ? "block" : "hidden"}`}
            style={{ background: "transparent" }}
          />
          <video
            ref={activeRef}
            src="/mascot/manyasha-greeting-alpha.webm"
            loop
            muted
            playsInline
            preload="auto"
            className={`w-full h-auto ${state === "active" ? "block" : "hidden"}`}
            style={{ background: "transparent" }}
          />
        </div>

        {/* Navigation guide */}
        {showGuide && pages && pages.length > 0 && (
          <div
            className={`absolute z-30 ${
              isFixed
                ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
                : "top-full left-1/2 -translate-x-1/2 mt-3"
            }`}
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            <div className="bg-navy-800/95 border border-white/10 backdrop-blur-xl p-2 min-w-[220px] rounded-xl shadow-xl shadow-black/30">
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider px-2 py-1 mb-1">
                Навигация
              </p>
              {pages.map((page, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePageClick(page);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:text-gold hover:bg-white/5 rounded-lg transition-all duration-200 flex items-center gap-2.5"
                >
                  <span className="w-1.5 h-1.5 bg-gold/50 rounded-full shrink-0" />
                  {page.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
