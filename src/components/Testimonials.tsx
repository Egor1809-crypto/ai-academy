"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "./ScrollReveal";

// FILE: src/components/Testimonials.tsx — VERSION 2.0.0
// Редизайн editorial+циан. Отзывы выровнены под 4 сегмента БФЛ (соло/управляющий/адвокат/
// юрфирма), формулировки честные и скромные (реальные кейсы БФЛ добывать трудно — см.
// Мастер-анализ; это плейсхолдеры под замену). Убраны gold и HUD-уголки.

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const SectionParticles = dynamic(() => import("./SectionParticles"), { ssr: false });

const reviews = [
  {
    text: "Реестр требований и отзывы, на которые уходил целый вечер, собираю за час по шаблонам с курса. Финал всё равно проверяю руками — но от готового разбора, а не с чистого листа. За сезон вышло вести заметно больше дел без помощника.",
    name: "Марина Кравцова",
    role: "Соло-юрист по БФЛ",
    company: "Частная практика",
    initials: "МК",
    metric: "×2",
    metricLabel: "дела без найма",
    featured: true,
  },
  {
    text: "В процедурах постоянно анализирую выписки и сделки должника в поиске сомнительных операций. Настроил связку инструментов с курса — то, на что уходил полный рабочий день, закрываю за пару часов. Освободившееся время — на действительно сложные дела.",
    name: "Дмитрий Козлов",
    role: "Арбитражный управляющий",
    company: "Независимая практика",
    initials: "ДК",
    metric: "−5ч",
    metricLabel: "на анализ сделок",
    featured: true,
  },
  {
    text: "Шёл с опаской из-за тайны доверителя. На курсе серьёзно разбирают 152-ФЗ, локальные модели и проверку галлюцинаций — теперь применяю ИИ, не рискуя ни тайной, ни выдуманной практикой в суде. Для меня это было обязательным условием.",
    name: "Елена Маркова",
    role: "Адвокат",
    company: "АБ «Правый берег»",
    initials: "ЕМ",
    metric: "152-ФЗ",
    metricLabel: "без риска по тайне",
    featured: false,
  },
  {
    text: "Внедрили подход во всей команде. Реестры, отзывы и типовые жалобы ушли на проверенные шаблоны, поток дел на человека вырос. Растём объёмом дел, а не новыми ставками — маржа перестала утекать в найм.",
    name: "Алексей Русаков",
    role: "Юрфирма по БФЛ",
    company: "2–10 человек",
    initials: "АР",
    metric: "0",
    metricLabel: "новых наймов",
    featured: false,
  },
];

export default function Testimonials() {
  return (
    <section className="py-14 sm:py-20 md:py-36 relative overflow-hidden bg-navy-900" style={{ fontFamily: HELV }}>
      <SectionParticles id="testimonials-particles" preset="nebula" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent" />
      <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyber-blue/[0.04] blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-12 md:mb-20 max-w-4xl">
            <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-cyber-blue/60 mb-6">результаты</p>
            <h2 className="leading-[0.9]" style={{ fontFamily: HELV, textTransform: "none", letterSpacing: "-0.03em" }}>
              <span className="block text-white" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(38px, 5.6vw, 82px)" }}>
                так это работает
              </span>
              <span className="block text-cyber-blue" style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(40px, 5.8vw, 84px)", lineHeight: 0.86, textShadow: "0 0 60px rgba(0,207,255,0.4)" }}>
                у практиков БФЛ
              </span>
            </h2>
            <p className="mt-8 text-[16px] md:text-[18px] text-[#e6e6e6]/55 max-w-xl leading-relaxed">
              Не кейсы «вообще» — конкретные задачи банкротства. Каждый из четырёх сегментов узнаёт свою рутину.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5">
          {reviews.map((r, i) => (
            <ScrollReveal key={r.name} direction={i % 2 === 0 ? "left" : "right"} delay={i * 100}>
              <div
                className={`group relative rounded-2xl border transition-all duration-700 overflow-hidden ${
                  r.featured
                    ? "bg-cyber-blue/[0.04] border-cyber-blue/20 hover:border-cyber-blue/40 hover:shadow-[0_0_40px_rgba(0,207,255,0.08)]"
                    : "bg-white/[0.02] border-white/[0.08] hover:border-cyber-blue/25"
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Metric column */}
                  <div className={`md:w-[140px] shrink-0 p-6 md:p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${r.featured ? "border-cyber-blue/10 bg-cyber-blue/[0.03]" : "border-white/[0.06]"}`}>
                    <div
                      className={r.featured ? "text-cyber-blue" : "text-white"}
                      style={{ fontFamily: HELV, fontWeight: 800, fontSize: "clamp(30px, 3.4vw, 46px)", lineHeight: 1, textShadow: r.featured ? "0 0 30px rgba(0,207,255,0.3)" : "none" }}
                    >
                      {r.metric}
                    </div>
                    <span className="text-[9px] font-mono text-[#e6e6e6]/40 uppercase tracking-wider mt-1.5 leading-tight">{r.metricLabel}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 md:p-8">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, s) => (
                        <svg key={s} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={r.featured ? "#00CFFF" : "#3a4250"}>
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    <p className="text-sm text-[#e6e6e6]/75 leading-relaxed mb-6">{r.text}</p>

                    <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${r.featured ? "bg-cyber-blue/10 border border-cyber-blue/25 text-cyber-blue" : "bg-white/5 border border-white/10 text-[#e6e6e6]/50"}`}>
                        {r.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white" style={{ fontFamily: HELV }}>{r.name}</div>
                        <div className="text-xs text-[#e6e6e6]/45">
                          {r.role} · <span className="text-[#e6e6e6]/35 font-mono text-[10px]">{r.company}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {r.featured && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyber-blue/40 via-cyber-blue/20 to-transparent" />}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
