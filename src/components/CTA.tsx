"use client";

import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

export default function CTA() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-navy-900 to-black z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <ScrollReveal direction="up">
        <div className="inline-block p-[1px] bg-linear-to-r from-gold to-cyber-purple mb-8">
          <div className="bg-navy-900 px-6 py-2">
            <span className="font-heading font-bold uppercase tracking-widest text-sm text-gold">
              Ограниченное предложение
            </span>
          </div>
        </div>

        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
          Начните применять AI
          <br />
          <span className="text-gradient-gold">уже на этой неделе</span>
        </h2>

        <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 mb-12 max-w-3xl mx-auto">
          <svg className="absolute top-0 left-0 w-6 h-6 text-gold/40" viewBox="0 0 24 24" fill="none">
            <path d="M0 10 L0 0 L10 0" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-6 h-6 text-gold/40" viewBox="0 0 24 24" fill="none">
            <path d="M24 14 L24 24 L14 24" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          <p className="text-lg md:text-xl font-medium mb-3">
            После сдачи квалификации —{" "}
            <span className="text-gold font-bold">в подарок сайт для юриста</span>{" "}
            стоимостью 88 000 &#8381;
          </p>
          <p className="text-gray-400 text-sm">
            + специальные условия партнёрской программы от команды арбитражных управляющих
          </p>
        </div>

        <Link
          href="/tariffs"
          className="inline-block relative group px-12 py-6 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest text-xl hover:bg-gold-light transition-all duration-300 shadow-[0_0_40px_rgba(0,207,255,0.4)] hover:shadow-[0_0_60px_rgba(0,207,255,0.7)] transform hover:-translate-y-1"
        >
          Начать обучение
          <div className="absolute inset-0 border-2 border-white/20 scale-105 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
        </Link>
        <p className="mt-6 text-sm text-gray-500 font-mono uppercase tracking-wider">
          Осталось 12 мест на ближайший поток
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Гарантия возврата 7 дней
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Рассрочка 0%
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
            Налоговый вычет 13%
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
