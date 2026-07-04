"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    title: "Pre-assessment",
    desc: "Оцениваем текущий уровень AI-грамотности команды и определяем зоны роста.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Тренинг",
    desc: "Интерактивное обучение с практикой на реальных задачах вашей компании.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Post-support",
    desc: "30 дней поддержки после тренинга: чат с экспертом, ответы на вопросы.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Сертификация",
    desc: "Именные сертификаты AI Legal для каждого участника команды.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

const formats = [
  {
    title: "Выездной тренинг",
    desc: "Приезжаем к вам в офис. Полное погружение без отрыва от рабочего места.",
    tag: "ПОПУЛЯРНО",
  },
  {
    title: "Online-формат",
    desc: "Для распределённых команд. Zoom/Teams с интерактивными заданиями.",
    tag: "УДАЛЁННО",
  },
  {
    title: "Гибридный",
    desc: "Часть команды в офисе, часть подключается онлайн. Единый формат для всех.",
    tag: "ГИБРИД",
  },
];

export default function CorporatePage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/4 left-1/2 w-[600px] h-[400px] bg-blue-500/8 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-5xl mx-auto px-6 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-16">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors text-sm mb-8"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Все продукты
                </Link>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-blue-400 text-xs font-mono uppercase tracking-widest">
                    Team
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Корпоративное{" "}
                  <span className="text-gradient-gold">обучение</span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Выездной или онлайн-тренинг для юридических команд от 5
                  человек. Программа адаптируется под специфику вашей компании.
                </p>
              </div>
            </ScrollReveal>

            {/* Formats */}
            <ScrollReveal direction="up" delay={200}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Форматы <span className="text-gold">обучения</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mb-20">
                {formats.map((f, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-8 text-center hover:border-gold/20 transition-colors duration-300"
                  >
                    <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/20 text-gold mb-4">
                      {f.tag}
                    </span>
                    <h3 className="font-heading font-bold text-lg mb-3">
                      {f.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* What's included */}
            <ScrollReveal direction="up" delay={300}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                Что <span className="text-gold">входит</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-20">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 p-6 flex gap-4 hover:border-gold/20 transition-colors duration-300"
                  >
                    <div className="w-12 h-12 shrink-0 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold mb-1">
                        {f.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal direction="up" delay={400}>
              <div className="bg-white/[0.03] border border-gold/20 p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Стоимость:{" "}
                  <span className="text-gold">индивидуально</span>
                </h2>
                <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                  Цена зависит от размера команды, формата и длительности
                  программы. Обсудим ваши задачи и подготовим коммерческое
                  предложение.
                </p>
                <Link
                  href="/tariffs"
                  className="inline-block px-10 py-4 bg-gold text-navy-900 font-heading font-extrabold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-[0_0_30px_rgba(0,207,255,0.3)] hover:shadow-[0_0_50px_rgba(0,207,255,0.5)] hover:-translate-y-0.5"
                >
                  Обсудить программу
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <FooterCompact />
    </>
  );
}
