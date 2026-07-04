import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import Audience from "@/components/Audience";
import WhyNow from "@/components/WhyNow";
import TrustBadges from "@/components/TrustBadges";
import CTA from "@/components/CTA";
import MissionSection from "./MissionSection";
import FomoSection from "./FomoSection";


export const metadata = {
  title: "О курсе | AI Legal — Нейросети для юристов",
  description: "Узнайте, почему курс AI Legal — лучший выбор для юристов. Программа, аудитория, преимущества.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-gold/5 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Почему <span className="text-gradient-gold">AI Legal</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Первый в России курс, где практикующие юристы учат коллег использовать нейросети
                для реальных задач — от анализа договоров до построения правовых позиций.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-20">
              <div className="bg-white/[0.03] border border-white/10 p-8 text-center">
                <p className="text-4xl font-heading font-bold text-gold mb-2">8</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">Недель обучения</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 p-8 text-center">
                <p className="text-4xl font-heading font-bold text-gold mb-2">40+</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">Практических заданий</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 p-8 text-center">
                <p className="text-4xl font-heading font-bold text-gold mb-2">15+</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">AI инструментов</p>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Чему вы <span className="text-gold">научитесь</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Составлять промпты для анализа юридических документов",
                    "Генерировать черновики исков, договоров и правовых заключений",
                    "Искать и анализировать судебную практику через AI",
                    "Обезличивать данные для безопасной работы с нейросетями",
                    "Создавать контент и визуал для юридического маркетинга",
                    "Автоматизировать due diligence и проверку контрагентов",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5">
                      <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Формат <span className="text-gold">обучения</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/[0.03] border border-white/10 p-6">
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">Видеоуроки</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Записанные лекции и live-демонстрации работы с нейросетями. Смотрите в удобное время.
                    </p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 p-6">
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">Практика</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Домашние задания на реальных юридических кейсах. Проверка и обратная связь от экспертов.
                    </p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 p-6">
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">Мастермайнды</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Еженедельные групповые сессии с экспертами. Разбор кейсов и ответы на вопросы.
                    </p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 p-6">
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">База промптов</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      50+ проверенных промптов для юридической практики. Регулярные обновления.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <WhyNow />
        <Audience />
        <TrustBadges />
        <MissionSection />
        <FomoSection />
        <CTA />

      </main>
      <FooterCompact />
    </>
  );
}
