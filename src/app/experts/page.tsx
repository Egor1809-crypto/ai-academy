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
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-gold/5 rounded-full blur-[150px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                  <span className="text-gold text-xs font-mono uppercase tracking-widest">
                    Команда
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Наши <span className="text-gradient-gold">эксперты</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Преподаватели курса — практикующие специалисты, которые ежедневно
                  используют AI в работе. Не теоретики, а те, кто внедрял нейросети
                  в реальные юрфирмы и добился измеримых результатов.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {expertise.map((e, i) => (
                <ScrollReveal key={i} direction="up" delay={i * 100}>
                  <div className="bg-white/[0.03] border border-white/10 p-8 text-center hover:border-gold/30 hover:shadow-[0_0_20px_rgba(0,207,255,0.08)] transition-all duration-500">
                    <p className="text-4xl font-heading font-bold text-gold mb-2">
                      {e.number}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                      {e.label}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Philosophy section */}
            <ScrollReveal direction="up" delay={300}>
              <div className="relative bg-white/[0.02] border border-white/10 p-10 md:p-14 mb-16">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

                <div className="flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                    <span className="text-gold text-xs font-mono uppercase tracking-widest">
                      Наша философия
                    </span>
                  </div>

                  <svg
                    className="w-10 h-10 text-gold/30 mb-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.207 11 15c0 1.855-1.5 3.4-3.407 3.4-1.084 0-2.126-.488-3.01-1.079zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.207 21 15c0 1.855-1.5 3.4-3.407 3.4-1.084 0-2.126-.488-3.01-1.079z" />
                  </svg>

                  <blockquote className="text-xl md:text-2xl font-heading font-medium text-white/90 leading-relaxed max-w-3xl mb-6">
                    AI не заменит юриста. Но юрист, владеющий AI, заменит того, кто им
                    не владеет. Мы учим не просто пользоваться нейросетями — мы учим
                    думать на языке AI и применять его как стратегическое преимущество.
                  </blockquote>

                  <div className="w-12 h-px bg-gold/40 mb-4" />
                  <p className="text-gold text-sm font-medium">Дмитрий Сизов</p>
                  <p className="text-gray-500 text-xs font-mono mt-1">
                    Основатель AI Legal
                  </p>
                </div>
              </div>
            </ScrollReveal>
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
