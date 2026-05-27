"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CTA from "@/components/CTA";
import ScrollReveal from "@/components/ScrollReveal";

const products = [
  {
    title: 'AI-Курс "Нейросети для юристов"',
    href: "/tariffs",
    tag: "ОНЛАЙН",
    tagColor: "bg-gold/20 text-gold border-gold/30",
    description:
      "8 недель интенсива. От промптинга до полной автоматизации юридической практики.",
    price: "от 45 000 ₽",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 14l9-5-9-5-9 5 9 5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 14l9-5-9-5-9 5 9 5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 14v7m9-12v7l-9 5-9-5v-7"
        />
      </svg>
    ),
  },
  {
    title: 'Живой семинар "AI-революция"',
    href: "/products/seminar",
    tag: "ОФФЛАЙН",
    tagColor: "bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30",
    description:
      "Однодневный семинар-погружение. Первый в России живой формат для юристов.",
    price: "от 15 000 ₽",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    title: 'Практикум "AI-Lab"',
    href: "/products/workshop",
    tag: "HANDS-ON",
    tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    description:
      "Двухдневный воркшоп в малых группах. Решаете свои реальные кейсы с AI.",
    price: "от 35 000 ₽",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
  {
    title: "Автоматизация юрфирмы",
    href: "/products/automation",
    tag: "B2B",
    tagColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    description:
      "Аудит + внедрение AI-инструментов в вашу юридическую практику.",
    price: "от 200 000 ₽",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: "Корпоративное обучение",
    href: "/products/corporate",
    tag: "TEAM",
    tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    description:
      "Выездной тренинг для юридических команд от 5 человек.",
    price: "индивидуально",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    title: "Услуги команды",
    href: "/products/services",
    tag: "СЕРВИС",
    tagColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    description:
      "Разработка промптов, AI-аудит, интеграция нейросетей в бизнес-процессы.",
    price: "от 50 000 ₽",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-28 bg-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid opacity-50" />
          <div className="absolute top-1/3 left-1/2 w-[700px] h-[500px] bg-gold/5 rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <ScrollReveal direction="up">
              <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-8">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
                  <span className="text-gold text-xs font-mono uppercase tracking-widest">
                    Каталог
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Наши{" "}
                  <span className="text-gradient-gold">продукты</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  От онлайн-курса до полной автоматизации юрфирмы. Выберите
                  формат, который подходит именно вам.
                </p>
              </div>
            </ScrollReveal>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, i) => (
                <ScrollReveal key={product.href} delay={i * 100}>
                  <Link href={product.href} className="group block h-full">
                    <div className="relative h-full bg-white/[0.03] border border-white/10 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(0,207,255,0.08)] hover:-translate-y-1">
                      {/* Corner decorations */}
                      <svg
                        className="absolute top-0 left-0 w-5 h-5 text-gold/0 group-hover:text-gold/30 transition-colors duration-500"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M0 20V0h20"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <svg
                        className="absolute bottom-0 right-0 w-5 h-5 text-gold/0 group-hover:text-gold/30 transition-colors duration-500"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M20 0v20H0"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>

                      {/* Tag */}
                      <div className="flex items-center justify-between mb-6">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 border ${product.tagColor}`}
                        >
                          {product.tag}
                        </span>
                        <div className="w-10 h-10 flex items-center justify-center text-gold/60 group-hover:text-gold transition-colors duration-300">
                          {product.icon}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-heading font-bold text-lg mb-3 text-white group-hover:text-gold transition-colors duration-300">
                        {product.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        {product.description}
                      </p>

                      {/* Price + Arrow */}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-gold font-heading font-bold text-sm">
                          {product.price}
                        </span>
                        <span className="w-8 h-8 flex items-center justify-center border border-white/10 group-hover:border-gold/40 group-hover:bg-gold/10 transition-all duration-300">
                          <svg
                            className="w-4 h-4 text-gray-500 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
