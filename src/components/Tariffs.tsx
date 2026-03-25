"use client";

import { useState } from "react";
import RegistrationModal from "./RegistrationModal";

const tariffs = [
  {
    name: "БАЗОВЫЙ",
    desc: "Основы работы с AI для ежедневных задач юриста.",
    price: "45 000 ₽",
    features: [
      "Все основные модули программы",
      "Доступ к платформе на 3 месяца",
      "Общий чат участников",
    ],
    popular: false,
  },
  {
    name: "ПРЕМИУМ",
    desc: "Полное погружение + готовые инструменты.",
    price: "75 000 ₽",
    features: [
      "Всё из Базового тарифа",
      "Доступ к AI-сервисам на 3 месяца",
      "Проверка домашних заданий",
      "Закрытые мастермайнды",
    ],
    popular: true,
    bonus: "В подарок — готовый сайт для юриста",
  },
  {
    name: "ПРОФЕССИОНАЛЬНЫЙ",
    desc: "Индивидуальная работа и внедрение AI в компанию.",
    price: "150 000 ₽",
    features: [
      "Всё из тарифа Премиум",
      "Индивидуальные консультации с куратором",
      "Аудит процессов вашей юр. фирмы",
      "Доступ к AI-сервисам на 5 месяцев",
    ],
    popular: false,
  },
];

export default function Tariffs() {
  const [modal, setModal] = useState<string | null>(null);

  return (
    <>
      <section id="tariffs" className="py-24 bg-tech-grid relative">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">
            Выберите свой <span className="text-gold">тариф</span>
          </h2>
          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto relative z-10">
            {tariffs.map((t) => (
              <div
                key={t.name}
                className={`p-8 flex flex-col ${
                  t.popular
                    ? "bg-navy-800 border-2 border-gold relative transform lg:-translate-y-4 shadow-[0_0_30px_rgba(0,207,255,0.15)] z-20"
                    : "bg-navy-900 border border-white/10 hover:border-white/30 transition-all"
                }`}
              >
                {t.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-navy-900 px-4 py-1 font-bold text-xs uppercase tracking-wider">
                    Хит продаж
                  </div>
                )}
                <h3 className={`text-2xl font-heading font-bold mb-2 ${t.popular ? "text-gold" : ""}`}>
                  {t.name}
                </h3>
                <p className="text-gray-400 text-sm mb-6 h-10">{t.desc}</p>
                <div className={`text-4xl font-bold ${t.popular ? "mb-2" : "mb-8"}`}>{t.price}</div>
                {t.bonus && (
                  <div className="bg-gold/10 border border-gold/30 p-3 mb-6 flex items-center gap-3">
                    <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span className="text-xs font-bold text-gold uppercase">{t.bonus}</span>
                  </div>
                )}
                <ul className="space-y-4 mb-8 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setModal(t.name)}
                  className={
                    t.popular
                      ? "w-full py-4 bg-gold text-navy-900 font-bold uppercase text-sm hover:bg-gold-light transition-colors shadow-[0_0_15px_rgba(0,207,255,0.4)] cursor-pointer"
                      : "w-full py-3 border border-white text-white font-bold uppercase text-sm hover:bg-white hover:text-navy-900 transition-colors cursor-pointer"
                  }
                >
                  {t.popular ? "Выбрать Премиум" : "Выбрать"}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-5xl mx-auto bg-cyber-purple/10 border border-cyber-purple/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-cyber-purple/20 to-transparent pointer-events-none" />
            <p className="text-lg font-medium relative z-10">
              Зарегистрируйтесь <span className="text-gold font-bold">до 1 мая</span> — получи купон на{" "}
              <span className="text-white font-bold bg-cyber-purple/30 px-2 py-1 mx-1 rounded">30 000 ₽</span>{" "}
              на конференцию &quot;Технологии права&quot;
            </p>
            <svg className="w-8 h-8 text-cyber-purple relative z-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </section>

      {modal && <RegistrationModal tariff={modal} onClose={() => setModal(null)} />}
    </>
  );
}
