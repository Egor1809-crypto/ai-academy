"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { EXPERTS } from "@/data/content";

const frontman = EXPERTS.find((e) => e.isFounder)!;
const experts = EXPERTS.filter((e) => !e.isFounder);

const PHILOSOPHY =
  "AI не заменит юриста. Но юрист, владеющий AI, заменит того, кто им не владеет. Мы учим не просто пользоваться нейросетями — мы учим думать на языке AI и применять его как стратегическое преимущество.";

/* Цитата-философия основателя — отдельный «слой» поверх блока Димы. */
function PhilosophyLayer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-navy-900/95 backdrop-blur-md border border-gold/25 rounded-2xl p-5 md:p-8 shadow-[0_22px_60px_rgba(0,0,0,0.55)] ${className}`}
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 mb-5">
        <span className="text-gold text-[11px] font-mono uppercase tracking-widest">
          Наша философия
        </span>
      </div>
      <svg className="w-9 h-9 text-gold/40 mb-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.207 11 15c0 1.855-1.5 3.4-3.407 3.4-1.084 0-2.126-.488-3.01-1.079zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.207 21 15c0 1.855-1.5 3.4-3.407 3.4-1.084 0-2.126-.488-3.01-1.079z" />
      </svg>
      <blockquote className="text-base md:text-lg font-heading font-medium text-white/90 leading-relaxed mb-4 italic">
        {PHILOSOPHY}
      </blockquote>
      <div className="w-10 h-px bg-gold/40 mb-3" />
      <p className="text-gold text-sm font-bold">{frontman.name}</p>
      <p className="text-gray-500 text-xs font-mono mt-0.5">Основатель AI Legal</p>
    </div>
  );
}

function CornerSVGs({ className }: { className?: string }) {
  return (
    <>
      <svg
        className={`absolute top-2 left-2 w-4 h-4 text-gold/50 z-20 ${className ?? ""}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 10V0h10" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg
        className={`absolute top-2 right-2 w-4 h-4 text-gold/50 z-20 ${className ?? ""}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16 10V0H6" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg
        className={`absolute bottom-2 left-2 w-4 h-4 text-gold/50 z-20 ${className ?? ""}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 6V16h10" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg
        className={`absolute bottom-2 right-2 w-4 h-4 text-gold/50 z-20 ${className ?? ""}`}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16 6V16H6" stroke="currentColor" strokeWidth="1" />
      </svg>
    </>
  );
}

export default function Experts() {
  return (
    <section id="experts" className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-[150px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Эксперты-<span className="text-gold">практики</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Не теоретики — практикующие специалисты, которые ежедневно используют AI в юридической работе
            </p>
          </div>
        </ScrollReveal>

        {/* Frontman — featured horizontal card */}
        <ScrollReveal direction="up" delay={0}>
          <div className="group mb-10 relative">
            <span className="font-mono text-xs text-gray-600 mb-2 block">01</span>
            <div className="relative flex flex-col md:flex-row bg-navy-800 border border-white/10 overflow-hidden hover:border-gold/40 hover:shadow-[0_0_30px_rgba(0,207,255,0.15)] hover:-translate-y-1 transition-all duration-500 lg:pr-[21rem] xl:pr-[24rem] lg:min-h-[540px]">
              {/* Left: photo */}
              <div className="relative w-full md:w-80 aspect-square md:aspect-auto md:min-h-[320px] lg:min-h-[540px] bg-navy-700 shrink-0 overflow-hidden">
                <CornerSVGs />
                <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                <Image
                  src={frontman.photo}
                  alt={frontman.name}
                  fill
                  className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-800/60 via-transparent to-navy-800/20 z-[5]" />
              </div>

              {/* Right: text content */}
              <div className="flex flex-col justify-center p-5 md:p-12 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 w-fit mb-5">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                  <span className="text-gold text-xs font-mono uppercase tracking-widest">Основатель</span>
                </div>
                <h3 className="font-heading font-bold text-3xl md:text-4xl uppercase mb-2">
                  {frontman.name}
                </h3>
                <p className="text-gold text-sm font-medium">{frontman.role}</p>
                <div className="w-12 h-px bg-gold/40 mt-3 mb-5" />
                <p className="text-gray-400 leading-relaxed max-w-xl group-hover:text-gray-300 transition-colors">
                  {frontman.desc}
                </p>
                <div className="flex gap-8 mt-8">
                  <div>
                    <p className="text-2xl font-heading font-bold text-gold">50+</p>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mt-1">AI-интеграций</p>
                  </div>
                  <div>
                    <p className="text-2xl font-heading font-bold text-gold">15+</p>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mt-1">Лет в юриспруденции</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Философия как слой — поверх правой части блока Димы (lg+) */}
            <PhilosophyLayer className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-5 xl:right-4 w-[19rem] xl:w-[21rem] z-30 rotate-1" />

            {/* На мобильных — той же цитатой, но обычным блоком под карточкой */}
            <PhilosophyLayer className="lg:hidden mt-6" />
          </div>
        </ScrollReveal>

        {/* Other experts — 4-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {experts.map((e, i) => (
            <ScrollReveal key={e.name} direction="up" delay={(i + 1) * 100}>
              <div className="group">
                <span className="font-mono text-xs text-gray-600 mb-2 block">
                  {String(i + 2).padStart(2, "0")}
                </span>

                <div className="relative w-full aspect-[4/5] bg-navy-800 border border-white/10 mb-4 overflow-hidden hover:border-gold/30 hover:shadow-[0_0_20px_rgba(0,207,255,0.12)] hover:-translate-y-1 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/90 z-10" />
                  <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[5]" />

                  <Image
                    src={e.photo}
                    alt={e.name}
                    fill
                    className="object-cover object-top grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />

                  <div className="absolute bottom-0 left-0 w-full p-5 z-20">
                    <div className="w-8 h-1 bg-gold mb-3 transform origin-left group-hover:scale-x-150 transition-transform duration-500" />
                    <h3 className="font-heading font-bold text-xl uppercase">{e.name}</h3>
                    <p className="text-gold text-sm font-medium mt-1">{e.role}</p>
                    <div className="w-10 h-px bg-gold/40 mt-2" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{e.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
