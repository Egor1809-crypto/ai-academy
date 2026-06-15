"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const blocks = [
    { val: timeLeft.days, label: "Дней" },
    { val: timeLeft.hours, label: "Часов" },
    { val: timeLeft.minutes, label: "Минут" },
    { val: timeLeft.seconds, label: "Секунд" },
  ];

  return (
    <div className="flex gap-1.5 sm:gap-3 justify-center">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-center gap-1.5 sm:gap-3">
          {i > 0 && <span className="text-base sm:text-2xl font-heading text-white/20">:</span>}
          <div className="text-center">
            <div className="w-11 h-11 sm:w-16 sm:h-16 bg-navy-900 border border-white/10 flex items-center justify-center">
              <span className="text-lg sm:text-2xl font-heading font-bold text-white tabular-nums">
                {String(b.val).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-gold uppercase mt-1.5 block font-mono tracking-wider">{b.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
