import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import Experts from "@/components/Experts";
import CTA from "@/components/CTA";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata = {
  title: "Эксперты | ИИ для юриста по банкротству",
  description:
    "Познакомьтесь с преподавателями курса AI Legal. Практикующие юристы с реальным опытом внедрения AI.",
  alternates: { canonical: "/experts" },
};

const expertise = [
  { number: "8", label: "Уроков курса" },
  { number: "40+", label: "Шаблонов БФЛ" },
  { number: "БФЛ", label: "Специализация" },
];

export default function ExpertsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden bg-navy-900 pt-14 pb-16 md:pt-20 md:pb-24 lg:min-h-[88vh] flex flex-col justify-center">
          {/* фактуры и свечения */}
          <div className="absolute inset-0 bg-tech-grid opacity-40 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-[620px] h-[620px] bg-cyber-blue/[0.06] rounded-full blur-[170px] pointer-events-none" />
          <div className="absolute bottom-0 -left-20 w-[520px] h-[380px] bg-cyber-blue/[0.04] rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            {/* мономётки-«шифры дела» по краям */}
            <div className="flex items-start justify-between mb-8 md:mb-14">
              <span className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.32em] text-gray-500">
                Дело № AL-2026 · Том III — Состав
              </span>
              <span className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.32em] text-gray-500 text-right">
                AI&nbsp;Legal · 2026
              </span>
            </div>

            {/* Гигантский editorial-сплит — антитеза без эха соседней секции */}
            <ScrollReveal direction="up">
              <p className="font-mono text-[11px] md:text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
                Теорию вы уже читали.
              </p>
              <h1 className="relative font-heading font-black leading-[0.82] tracking-[-0.02em] text-white" style={{ textTransform: "none" }}>
                <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem]">
                  Практика,
                </span>
                <span
                  className="block font-serif-display italic font-medium text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] mt-1 w-fit"
                  style={{
                    background: "linear-gradient(120deg, #70EFFF 0%, #00CFFF 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 40px rgba(0,207,255,0.18))",
                  }}
                >
                  а не теория
                </span>
                {/* «Печать на деле» */}
                <span className="dossier-stamp dossier-stamp--alt text-gold/50 text-[10px] md:text-xs not-italic absolute right-0 -bottom-2 hidden md:inline-block">
                  Заверено делами
                </span>
              </h1>
            </ScrollReveal>

            {/* Оглавление тома — редакторская строка с нумерацией */}
            <div className="mt-9 md:mt-12 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] md:text-[11px] font-mono uppercase tracking-[0.22em] text-gray-500">
                <span><span className="text-gold/40 mr-1.5">01</span>Банкротство (БФЛ)</span>
                <span className="text-gold/30">·</span>
                <span><span className="text-gold/40 mr-1.5">02</span>Арбитражное управление</span>
                <span className="text-gold/30">·</span>
                <span><span className="text-gold/40 mr-1.5">03</span>Судебная практика</span>
                <span className="text-gold/30">·</span>
                <span><span className="text-gold/40 mr-1.5">04</span>Внедрение ИИ</span>
              </div>
            </div>

            {/* Подзаголовок + стат-фигуры (редакторский футер) */}
            <div className="mt-10 md:mt-16 grid md:grid-cols-[1.15fr_1fr] gap-8 md:gap-16 items-end">
              <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-xl">
                Каждый в этом составе ведёт живую практику — и применяет в ней AI.
                Не демо на слайдах, а{" "}
                <span className="dossier-marker text-white">инструмент в исходящих документах</span>,
                который приносит клиенту измеримый результат.
              </p>
              <div>
                <p className="dossier-margin mb-3 md:text-right">Материалы дела</p>
                <div className="flex justify-between md:justify-end gap-6 md:gap-12">
                  {expertise.map((e, i) => (
                    <div key={i} className="text-left md:text-right">
                      <div className="text-4xl md:text-5xl font-heading font-black text-gradient-gold leading-none">
                        {e.number}
                      </div>
                      <div className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-gray-500 mt-2 max-w-[92px] md:ml-auto">
                        {e.label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="dossier-margin mt-4 md:text-right text-[10px]">
                  По состоянию на III кв. 2026 · данные заверены
                </p>
              </div>
            </div>
          </div>
        </section>

        <Experts />
        <CTA />
      </main>
      <FooterCompact />
    </>
  );
}
