"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/Audience.tsx — VERSION 3.0.0
// «Кому это нужно» переосмыслено по мастер-плану (Акт 02 «Разгон»): сочно и ломано, а не
// разреженный pinned-void. Marquee реальных БФЛ-задач + 4 оверсайз-блока со числами-гигантами
// и ломаной лесенкой. Копирайт подтянут под данные (Мастер-анализ: конвейер, комплаенс/ФЗ-152,
// помощник 100к→3т.р.). СОХРАНЕНО: SectionParticles (линии).

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

// Реальные задачи БФЛ (из фич-листа конкурента «Юджин» = карта настоящих болей) — для marquee
const PAINS = [
  "реестр требований кредиторов",
  "оспаривание сделок 61.2–61.9",
  "субсидиарная ответственность",
  "запросы в ФНС · Росреестр · ФССП",
  "протокол собрания кредиторов",
  "отзыв на требование",
  "анализ кредитного досье",
  "включение в РТК",
  "Федресурс · КАД.Арбитр",
];

const SEGMENTS = [
  {
    n: "01",
    tag: "соло-юрист по БФЛ",
    role: "ядро",
    chaos: "Реестры, отзывы, жалобы — руками. Недели рутины на каждое дело, вечно не хватает рук.",
    system: "Реестр, отзывы, жалобы за минуты, а не за вечер. Вдвое больше дел без найма.",
    metric: "×2",
    metricLabel: "дела без найма",
    shift: "lg:ml-0",
  },
  {
    n: "02",
    tag: "арбитражный управляющий",
    role: "конвейер процедур",
    chaos: "Поток процедур и отчётности, штрафы за сроки. Живой помощник стоит 100 000 ₽/мес.",
    system: "ИИ как младший юрист за 3 т.р./мес — держит поток и не срывает сроки.",
    metric: "3 т.р.",
    metricLabel: "вместо 100 000/мес",
    shift: "lg:ml-[10%]",
  },
  {
    n: "03",
    tag: "адвокат",
    role: "комплаенс",
    chaos: "Тайна и этика: доверить нейросети материалы доверителя — страшно и рискованно.",
    system: "Локально, на своих данных, по ФЗ-152. С проверкой галлюцинаций перед подачей.",
    metric: "152-ФЗ",
    metricLabel: "без утечки тайны",
    shift: "lg:ml-[4%]",
  },
  {
    n: "04",
    tag: "юрфирма по БФЛ",
    role: "2–10 человек",
    chaos: "Расти можно только наймом — а новый сотрудник съедает и без того тонкую маржу.",
    system: "Больше дел без найма: регламент использования ИИ + обучение всей команды.",
    metric: "0",
    metricLabel: "новых наймов",
    shift: "lg:ml-[14%]",
  },
];

export default function Audience() {
  return (
    <section id="about" className="relative bg-navy-800 overflow-hidden py-16 md:py-28" style={{ fontFamily: HELV }}>
      <style>{`@keyframes aud-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <SectionParticles id="audience-particles" preset="matrix" />
      <div aria-hidden className="absolute top-1/4 -left-40 w-[560px] h-[560px] rounded-full bg-cyber-blue/[0.05] blur-[150px] pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyber-blue/[0.04] blur-[150px] pointer-events-none" />

      {/* ── Marquee реальных БФЛ-задач: задаёт «хаос»-тон ── */}
      <div className="relative z-10 border-y border-white/[0.08] py-4 md:py-5 overflow-hidden select-none mb-14 md:mb-24">
        <div className="whitespace-nowrap" style={{ animation: "aud-marquee 34s linear infinite", width: "max-content" }}>
          {[0, 1].map((rep) => (
            <span key={rep} aria-hidden={rep === 1}>
              {PAINS.map((p, i) => (
                <span key={i} className="font-serif-display italic text-[#e6e6e6]/35" style={{ fontSize: "clamp(18px, 2.4vw, 32px)", paddingInline: "0.45em" }}>
                  {p}
                  <span className="text-cyber-blue/70 not-italic" style={{ fontFamily: HELV, paddingInline: "0.35em" }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ── Заголовок — сломанная иерархия ── */}
        <ScrollReveal direction="up">
          <div className="mb-14 md:mb-24 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">целевая аудитория</p>
            <h2 className="leading-[0.88]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.035em" }}>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(46px, 8.5vw, 118px)" }}>
                кому это
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(48px, 8.7vw, 120px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                нужно?
              </span>
            </h2>
            <p className="mt-8 text-[17px] md:text-[20px] text-[#e6e6e6]/60 max-w-2xl leading-relaxed">
              БФЛ — <span className="text-white font-semibold">568 000</span> дел за 2025 год, +31,5%. Вопрос не «есть ли
              рынок», а кто соберёт систему первым. У каждого свой хаос — и своя система.
            </p>
          </div>
        </ScrollReveal>

        {/* ── 4 оверсайз-блока: число-гигант + имя + хаос→система + метрика-гигант, ломаной лесенкой ── */}
        <div>
          {SEGMENTS.map((s, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 90}>
              <div className={`group ${s.shift} border-t border-white/[0.1] hover:border-cyber-blue/40 transition-colors duration-500 py-10 md:py-14`}>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-y-6 gap-x-10 items-start">
                  {/* левая колонна: число + имя + хаос→система */}
                  <div className="flex items-start gap-6 md:gap-10 min-w-0">
                    <span
                      className="font-black text-white/[0.08] group-hover:text-cyber-blue/25 transition-colors duration-500 leading-none select-none shrink-0"
                      style={{ fontFamily: HELV, fontSize: "clamp(64px, 9vw, 150px)", letterSpacing: "-0.04em" }}
                    >
                      {s.n}
                    </span>
                    <div className="min-w-0 pt-1 md:pt-2">
                      <h3
                        className="text-white"
                        style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(28px, 4vw, 54px)", letterSpacing: "-0.03em", lineHeight: 0.98, textTransform: "none" }}
                      >
                        {s.tag}
                      </h3>
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyber-blue/55 mt-2 mb-5">{s.role}</p>
                      <div className="space-y-2.5 max-w-2xl">
                        <p className="flex items-start gap-3 text-[15px] md:text-[17px] leading-relaxed text-[#e6e6e6]/55">
                          <span className="font-mono text-[10px] text-[#e6e6e6]/35 pt-1.5 shrink-0 w-[46px]">хаос</span>
                          <span>{s.chaos}</span>
                        </p>
                        <p className="flex items-start gap-3 text-[15px] md:text-[17px] leading-relaxed text-[#f4f2ec]">
                          <span className="font-mono text-[10px] text-cyber-blue/70 pt-1.5 shrink-0 w-[46px]">система</span>
                          <span>{s.system}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* правая колонна: метрика-гигант */}
                  <div className="lg:text-right lg:pl-6 lg:border-l lg:border-white/[0.08] shrink-0 lg:min-w-[190px]">
                    <div
                      className="text-cyber-blue leading-none"
                      style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(34px, 4vw, 56px)", letterSpacing: "-0.02em", textShadow: "0 0 40px rgba(0,207,255,0.3)" }}
                    >
                      {s.metric}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#e6e6e6]/40 mt-2">{s.metricLabel}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
