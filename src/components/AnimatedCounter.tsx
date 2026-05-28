"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  label: string;
}

export default function AnimatedCounter({ end, suffix = "", prefix = "", duration = 2000, label }: Props) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const startAnimation = () => {
      if (started.current) return;
      started.current = true;
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startAnimation();
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    // Fallback: if element is already visible on mount (e.g. no scroll needed)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startAnimation();
    }

    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="text-left group">
      <div className="text-4xl md:text-5xl font-heading font-bold text-gradient-gold transition-all duration-500 group-hover:drop-shadow-[0_0_8px_rgba(0,207,255,0.4)]">
        {prefix}{count}{suffix}
      </div>
      <div className="text-sm text-gray-400 mt-2 uppercase tracking-wider font-mono">{label}</div>
    </div>
  );
}
