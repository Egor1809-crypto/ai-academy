import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Tariffs from "@/components/Tariffs";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";

export const metadata = {
  title: "Тарифы | AI Legal — Нейросети для юристов",
  description: "Выберите подходящий тариф обучения AI Legal. Рассрочка 0%, возврат 13% через налоговый вычет, гарантия возврата 7 дней.",
};

const guarantees = [
  {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "7 дней гарантия",
    text: "Полный возврат средств, если курс не подойдёт. Без вопросов и бюрократии.",
  },
  {
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    title: "Рассрочка 0%",
    text: "Разбейте платёж на 12 месяцев без переплат. Начните учиться сейчас.",
  },
  {
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Налоговый вычет 13%",
    text: "Верните часть стоимости обучения через налоговый вычет на образование.",
  },
];

export default function TariffsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyber-purple/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                <span className="text-gold text-xs font-mono uppercase tracking-widest">Тарифы</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Выберите свой <span className="text-gradient-gold">тариф</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Три тарифа под разные задачи — от самостоятельного изучения до индивидуального внедрения AI в вашу практику.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {guarantees.map((g, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 p-6 hover:border-gold/30 transition-all duration-500">
                  <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={g.icon} />
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-2">{g.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{g.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Tariffs />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
