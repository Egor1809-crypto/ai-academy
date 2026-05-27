import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Program from "@/components/Program";
import CTA from "@/components/CTA";
import PageMascot from "@/components/PageMascot";

export const metadata = {
  title: "Программа курса | AI Legal — Нейросети для юристов",
  description: "Подробная программа курса AI Legal: 4 модуля, 8 недель, 40+ практических заданий. ChatGPT, Claude, Midjourney для юристов.",
};

const highlights = [
  {
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    title: "Только практика",
    text: "Каждый модуль — это реальные юридические задачи, решаемые с помощью AI прямо во время обучения.",
  },
  {
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    title: "Актуальные инструменты",
    text: "ChatGPT-4, Claude 3.5, Perplexity, Midjourney, Gemini — полный арсенал для юриста 2025 года.",
  },
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Безопасность данных",
    text: "Отдельный блок по адвокатской тайне и обезличиванию данных при работе с нейросетями.",
  },
];

export default function ProgramPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/3 right-0 w-[500px] h-[400px] bg-cyber-purple/5 rounded-full blur-[180px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                <span className="text-gold text-xs font-mono uppercase tracking-widest">Программа</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Программа <span className="text-gradient-gold">курса</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                4 модуля &middot; 8 недель &middot; 40+ практических заданий. От базовых навыков промптинга до построения AI-системы для целой юрфирмы.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {highlights.map((h, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 p-6 hover:border-gold/30 transition-all duration-500">
                  <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={h.icon} />
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-2">{h.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{h.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Program />
        <CTA />
        <PageMascot
          variant="idle"
          position="bottom-right"
          size="sm"
          speech="4 модуля, 8 недель — и ты AI-юрист!"
        />
      </main>
      <Footer />
    </>
  );
}
