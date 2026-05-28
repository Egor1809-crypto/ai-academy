"use client";

import { useState } from "react";
import RegistrationModal from "./RegistrationModal";
import CountdownTimer from "./CountdownTimer";
import ScrollReveal from "./ScrollReveal";
import { TARIFFS, COURSE } from "@/data/content";

export default function Tariffs() {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <>
      <section id="tariffs" className="py-28 bg-tech-grid relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyber-purple/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <ScrollReveal direction="up">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Выберите свой <span className="text-gold">тариф</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto mb-8">
                Рассрочка на 12 месяцев без переплат. Возврат 13% через налоговый вычет.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-xs mx-auto mb-16">
            <p className="text-center text-xs uppercase text-gray-500 font-mono tracking-widest mb-4">
              Спецпредложение истекает через
            </p>
            <CountdownTimer targetDate={COURSE.offerDeadline} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TARIFFS.map((t, i) => (
              <ScrollReveal key={t.id} direction="up" delay={i * 120}>
              <div
                className={`p-8 flex flex-col relative transition-all duration-500 h-full ${
                  t.popular
                    ? "bg-white/[0.05] backdrop-blur-sm border-2 border-gold transform lg:-translate-y-4 shadow-[0_0_40px_rgba(0,207,255,0.12)]"
                    : "bg-white/[0.02] border border-white/10 hover:border-white/25 hover:shadow-[0_0_20px_rgba(0,207,255,0.08)]"
                }`}
              >
                {t.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-navy-900 px-5 py-1.5 font-bold text-xs uppercase tracking-wider">
                    Популярный выбор
                  </div>
                )}

                <h3 className={`text-2xl font-heading font-bold mb-2 uppercase ${t.popular ? "text-gold" : ""}`}>
                  {t.name}
                </h3>
                <p className="text-gray-400 text-sm mb-6 min-h-[40px]">{t.desc}</p>

                <div className="mb-2">
                  <span className={`text-4xl font-bold ${t.popular ? "text-gradient-gold" : ""}`}>
                    {t.priceFormatted}
                  </span>
                  <span className="text-gray-400 text-lg ml-1">&#8381;</span>
                </div>
                <p className="text-xs text-gray-500 mb-6 font-mono">
                  или {t.monthly} &#8381;/мес в рассрочку
                </p>

                {t.bonus && (
                  <div className="bg-gold/10 border border-gold/30 p-3 mb-6 flex items-center gap-3">
                    <svg className="w-6 h-6 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span className="text-xs font-bold text-gold uppercase">{t.bonus}</span>
                  </div>
                )}

                <ul className="space-y-3 mb-8 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setModal(t.name)}
                  className={`w-full py-4 font-bold uppercase text-sm transition-all duration-300 cursor-pointer ${
                    t.popular
                      ? "bg-gold text-navy-900 hover:bg-gold-light shadow-[0_0_20px_rgba(0,207,255,0.3)] hover:shadow-[0_0_30px_rgba(0,207,255,0.5)]"
                      : "border border-white/20 text-white hover:bg-white hover:text-navy-900"
                  }`}
                >
                  Выбрать {t.name}
                </button>
              </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-12 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/[0.03] border border-white/10 text-sm text-gray-400">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>
                Корпоративное обучение от 5 человек — <span className="text-gold font-bold">индивидуальные условия</span>
              </span>
              <a href="https://t.me/ailegal_academy_bot" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline underline-offset-2 ml-2">
                Узнать
              </a>
            </div>
          </div>
        </div>
      </section>

      {modal && <RegistrationModal tariff={modal} onClose={() => setModal(null)} />}
    </>
  );
}
