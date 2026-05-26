import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Experts from "@/components/Experts";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";

export const metadata = {
  title: "Эксперты | AI Legal — Нейросети для юристов",
  description: "Познакомьтесь с преподавателями курса AI Legal. Практикующие юристы с реальным опытом внедрения AI.",
};

const expertise = [
  {
    number: "50+",
    label: "Лет суммарного опыта",
  },
  {
    number: "200+",
    label: "Внедрений AI в юрпрактику",
  },
  {
    number: "1000+",
    label: "Обученных юристов",
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
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                <span className="text-gold text-xs font-mono uppercase tracking-widest">Команда</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Наши <span className="text-gradient-gold">эксперты</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Преподаватели курса — практикующие юристы, которые ежедневно используют AI в работе.
                Не теоретики, а те, кто внедрял нейросети в реальные юрфирмы.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {expertise.map((e, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 p-8 text-center">
                  <p className="text-4xl font-heading font-bold text-gold mb-2">{e.number}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">{e.label}</p>
                </div>
              ))}
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
