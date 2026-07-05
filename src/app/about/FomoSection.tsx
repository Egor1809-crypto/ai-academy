"use client";

import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";

const timeline = [
  { year: "2024", label: "Early Adopters", color: "bg-gold" },
  { year: "2025", label: "Массовое внедрение", color: "bg-gold" },
  { year: "2026", label: "Новый стандарт", color: "bg-cyber-blue" },
  { year: "2027", label: "Отставшие теряют клиентов", color: "bg-red-500" },
];

export default function FomoSection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-navy-900 via-black to-navy-900" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-blue/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 mb-8">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-mono uppercase tracking-widest">
                Не упустите момент
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Поезд уходит —{" "}
              <span className="text-gradient-gold">успейте запрыгнуть</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Stats ticker */}
        <ScrollReveal direction="up" delay={200}>
          <div className="bg-white/[0.03] border border-white/10 p-8 md:p-12 mb-16 text-center">
            <p className="text-2xl md:text-4xl font-heading font-bold text-white mb-4">
              <span className="text-gold">92%</span> рутинных юридических задач
            </p>
            <p className="text-lg md:text-xl text-gray-300">
              можно автоматизировать к 2027 году
            </p>
          </div>
        </ScrollReveal>

        {/* Counter */}
        <ScrollReveal direction="up" delay={300}>
          <div className="flex justify-center mb-20">
            <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-10 inline-block">
              <AnimatedCounter
                end={547}
                suffix="+"
                label="юристов уже обучаются прямо сейчас"
                duration={2500}
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Timeline */}
        <ScrollReveal direction="up" delay={400}>
          <div className="relative mb-20">
            {/* Connecting line */}
            <div className="absolute top-8 left-0 right-0 h-px bg-linear-to-r from-gold via-cyber-blue to-red-500 hidden md:block" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {timeline.map((t, i) => (
                <div key={i} className="text-center relative">
                  <div
                    className={`w-4 h-4 ${t.color} mx-auto mb-4 rotate-45 shadow-[0_0_15px_currentColor] hidden md:block`}
                  />
                  <p className="font-heading font-bold text-2xl text-white mb-2">
                    {t.year}
                  </p>
                  <p className="text-gray-400 text-sm">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Urgent CTA */}
        <ScrollReveal direction="up" delay={500}>
          <div className="text-center">
            <Link
              href="/tariffs"
              className="inline-block relative group px-12 py-6 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest text-xl hover:bg-gold-light transition-all duration-300 shadow-[0_0_40px_rgba(0,207,255,0.4)] hover:shadow-[0_0_60px_rgba(0,207,255,0.7)] transform hover:-translate-y-1 animate-pulse"
            >
              Начать обучение сейчас
              <div className="absolute inset-0 border-2 border-white/20 scale-105 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
            </Link>
            <p className="mt-6 text-sm text-gray-500 font-mono uppercase tracking-wider">
              Места ограничены. Следующий поток стартует через 2 недели.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
