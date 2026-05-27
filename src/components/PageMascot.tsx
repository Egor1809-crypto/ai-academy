"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MascotSprite = dynamic(() => import("./MascotSprite"), { ssr: false });

interface PageMascotProps {
  /** Which animation variant */
  variant?: "idle" | "greeting";
  /** Position on the page */
  position?: "bottom-right" | "bottom-left" | "center-right";
  /** Size class */
  size?: "sm" | "md" | "lg";
  /** Extra CSS classes */
  className?: string;
  /** Show speech bubble */
  speech?: string;
}

const sizeMap = {
  sm: "w-24 h-24 md:w-32 md:h-32",
  md: "w-32 h-32 md:w-44 md:h-44",
  lg: "w-40 h-40 md:w-56 md:h-56",
};

const positionMap = {
  "bottom-right": "fixed bottom-24 right-6 z-40",
  "bottom-left": "fixed bottom-24 left-6 z-40",
  "center-right": "absolute right-0 top-1/2 -translate-y-1/2 z-20",
};

export default function PageMascot({
  variant = "idle",
  position = "bottom-right",
  size = "md",
  className = "",
  speech,
}: PageMascotProps) {
  const [visible, setVisible] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (visible && speech) {
      const timer = setTimeout(() => setSpeechVisible(true), 1200);
      const hide = setTimeout(() => setSpeechVisible(false), 8000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hide);
      };
    }
  }, [visible, speech]);

  return (
    <div
      className={`${positionMap[position]} ${className} transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } pointer-events-none`}
    >
      {/* Speech bubble */}
      {speech && (
        <div
          className={`absolute -top-16 right-0 bg-navy-800/95 border border-gold/30 backdrop-blur-sm px-4 py-2.5 max-w-[200px] transition-all duration-500 ${
            speechVisible
              ? "opacity-100 -translate-y-2"
              : "opacity-0 translate-y-0"
          }`}
        >
          <p className="text-xs text-gray-300 leading-relaxed">{speech}</p>
          <div className="absolute bottom-0 right-8 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gold/30" />
        </div>
      )}

      {/* Mascot sprite animation */}
      <div className={`${sizeMap[size]} mascot-float relative`}>
        <div className="absolute -inset-2 bg-gold/5 rounded-full blur-xl" />
        <MascotSprite
          frameCount={16}
          fps={variant === "greeting" ? 12 : 10}
          className="w-full h-full relative z-10"
        />
      </div>
    </div>
  );
}
