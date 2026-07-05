"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/UseCases.tsx — VERSION 2.0.0
// Редизайн editorial+циан (Акт 02). Сценарии заземлены на реальный конвейер БФЛ (карта задач
// из фич-листа «Юджин» + Мастер-анализ): заявление → РТК → отзывы → оспаривание сделок 61.2–61.9
// → субсидиарка → запросы → досье → собрания → мониторинг. Инструменты: Claude-first.
// Убраны gold + нерелевантные MIDJOURNEY/RUNWAY. СОХРАНЕНО: SectionParticles (линии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const cases = [
  { n: "01", title: "Заявление о банкротстве", desc: "Пакет по 127-ФЗ под конкретного должника: заявление, опись, список кредиторов." },
  { n: "02", title: "Включение в реестр (РТК)", desc: "Заявления о включении в реестр требований, расчёт и обоснование сумм." },
  { n: "03", title: "Отзывы и возражения", desc: "Отзывы на требования других кредиторов, возражения по составу реестра." },
  { n: "04", title: "Оспаривание сделок", desc: "Анализ сделок должника на подозрительность и предпочтение (ст. 61.2–61.9), заявления об оспаривании.", highlight: true },
  { n: "05", title: "Субсидиарная ответственность", desc: "Сбор оснований и заявления о привлечении контролирующих лиц к субсидиарке.", highlight: true },
  { n: "06", title: "Запросы и ходатайства", desc: "Запросы в ФНС, Росреестр, ФССП, банки; ходатайства об истребовании доказательств." },
  { n: "07", title: "Анализ кредитного досье", desc: "Разбор досье должника: поиск активов, сомнительных операций и аффилированности." },
  { n: "08", title: "Собрания кредиторов", desc: "Протоколы, уведомления, бюллетени и повестки собраний — по шаблонам под дело." },
  { n: "09", title: "Мониторинг сроков", desc: "Отслеживание публикаций, заседаний и дедлайнов по всем делам через Федресурс и КАД." },
];

const tools = ["CLAUDE", "GPT", "GEMINI", "PERPLEXITY", "NOTEBOOKLM", "RAG"];

export default function UseCases() {
  return (
    <section className="py-14 sm:py-20 md:py-28 bg-navy-900 relative overflow-hidden" style={{ fontFamily: HELV }}>
      <SectionParticles id="usecases-particles" preset="orbit" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-cyber-blue/[0.04] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-20 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">сценарии применения</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="font-serif-display italic block text-[#e6e6e6]/50 mb-2" style={{ fontSize: "clamp(20px, 2.8vw, 38px)" }}>
                весь конвейер банкротства —
              </span>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(38px, 6vw, 88px)" }}>
                от заявления
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 6.2vw, 90px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                до субсидиарки
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Не «нейросети вообще». Конкретные задачи БФЛ, которые система закрывает на потоке — руками юриста, но за минуты.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06]">
          {cases.map((c, index) => (
            <ScrollReveal key={c.n} direction="up" delay={index * 50}>
              <div
                className={`relative h-full bg-navy-900 p-6 md:p-8 group transition-all duration-500 ${
                  c.highlight ? "bg-cyber-blue/[0.04]" : "hover:bg-cyber-blue/[0.03]"
                }`}
              >
                <div className="flex items-baseline justify-between mb-5">
                  <span
                    className={`font-black leading-none select-none transition-colors duration-500 ${c.highlight ? "text-cyber-blue/40" : "text-white/[0.1] group-hover:text-cyber-blue/40"}`}
                    style={{ fontFamily: HELV, fontSize: "clamp(38px, 4vw, 52px)", letterSpacing: "-0.03em" }}
                  >
                    {c.n}
                  </span>
                  {c.highlight && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyber-blue/70 border border-cyber-blue/25 rounded px-2 py-1">
                      дифференциатор
                    </span>
                  )}
                </div>
                <h3
                  className={`mb-3 ${c.highlight ? "text-cyber-blue" : "text-white group-hover:text-cyber-blue transition-colors duration-500"}`}
                  style={{ fontFamily: HELV, fontWeight: 700, fontSize: "clamp(18px, 1.7vw, 22px)", letterSpacing: "-0.01em", textTransform: "none" }}
                >
                  {c.title}
                </h3>
                <p className="text-[#e6e6e6]/50 text-[14px] leading-relaxed">{c.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="fade" delay={200}>
          <div className="mt-16 pt-10 border-t border-white/[0.08]">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-8">инструменты, которые вы освоите · Claude-first</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 md:gap-x-12">
              {tools.map((t) => (
                <span
                  key={t}
                  className="font-black tracking-tight text-[#e6e6e6]/45 hover:text-cyber-blue transition-colors duration-500 cursor-default"
                  style={{ fontFamily: HELV, fontSize: "clamp(24px, 3.4vw, 46px)", letterSpacing: "-0.02em" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
