import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Experts from "@/components/Experts";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata = {
  title: "Эксперты | AI Legal — Нейросети для юристов",
  description:
    "Познакомьтесь с преподавателями курса AI Legal. Практикующие юристы с реальным опытом внедрения AI.",
};

const expertise = [
  {
    number: "15+",
    label: "Лет в юриспруденции",
  },
  {
    number: "500+",
    label: "Обученных юристов",
  },
  {
    number: "50+",
    label: "AI-интеграций в юрфирмы",
  },
];

export default function ExpertsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden bg-navy-900 pt-14 pb-16 md:pt-20 md:pb-24 lg:min-h-[88vh] flex flex-col justify-center">
          {/* фактуры и свечения */}
          <div className="absolute inset-0 bg-tech-grid opacity-40 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-[620px] h-[620px] bg-cyber-purple/[0.07] rounded-full blur-[170px] pointer-events-none" />
          <div className="absolute bottom-0 -left-20 w-[520px] h-[380px] bg-gold/[0.06] rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            {/* мономётки-«шифры дела» по краям */}
            <div className="flex items-start justify-between mb-8 md:mb-14">
              <span className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.32em] text-gray-500">
                Досье · Эксперты
              </span>
              <span className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.32em] text-gray-500 text-right">
                AI&nbsp;Legal · Саратов
              </span>
            </div>

            {/* Гигантский editorial-сплит */}
            <ScrollReveal direction="up">
              <h1 className="font-heading font-black uppercase leading-[0.82] tracking-[-0.02em] text-white">
                <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem]">
                  Не теоретики
                </span>
                <span className="flex items-baseline gap-4 flex-wrap mt-1">
                  <span
                    className="font-serif-display italic font-medium text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem]"
                    style={{
                      background: "linear-gradient(120deg, #70EFFF 0%, #00CFFF 45%, #FF007A 105%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      filter: "drop-shadow(0 0 40px rgba(0,207,255,0.18))",
                    }}
                  >
                    практики
                  </span>
                  <span className="dossier-stamp text-gold/70 text-[10px] md:text-xs not-italic mb-3 hidden sm:inline-block">
                    Практика
                  </span>
                </span>
              </h1>
            </ScrollReveal>

            {/* Разделитель с инлайн-лейблами (редакторская строка) */}
            <div className="mt-9 md:mt-12 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] md:text-[11px] font-mono uppercase tracking-[0.22em] text-gray-500">
                <span>AI-внедрение</span>
                <span className="text-gold/40">/</span>
                <span>Судебная практика</span>
                <span className="text-gold/40">/</span>
                <span>Договоры</span>
                <span className="text-gold/40">/</span>
                <span>Legal Design</span>
              </div>
            </div>

            {/* Подзаголовок + стат-фигуры (редакторский футер) */}
            <div className="mt-10 md:mt-16 grid md:grid-cols-[1.15fr_1fr] gap-8 md:gap-16 items-end">
              <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-xl">
                Преподаватели ежедневно применяют AI в реальной юридической работе —
                внедряют нейросети в юрфирмы и получают измеримые результаты.
              </p>
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
            </div>
          </div>
        </section>

        <Experts />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
