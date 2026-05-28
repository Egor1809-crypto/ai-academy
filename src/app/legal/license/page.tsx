import { SITE, COURSE } from "@/data/content";

export const metadata = {
  title: `Лицензия | ${SITE.name}`,
  description: "Информация о лицензии на образовательную деятельность AI Legal Academy.",
};

export default function LicensePage() {
  return (
    <section className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute top-1/3 left-1/2 w-[600px] h-[400px] bg-gold/5 rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-6">
            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Юридический документ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Лицензия на <span className="text-gold">образовательную деятельность</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Сведения о лицензировании
          </p>
        </div>

        {/* Document body */}
        <div className="bg-white/[0.02] border border-white/10 p-8 md:p-12 space-y-8">
          {/* Status banner */}
          <div className="bg-gold/10 border border-gold/30 px-5 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-gold font-medium text-sm mb-1">Лицензия в процессе оформления</p>
              <p className="text-gray-400 text-xs">
                {SITE.fullName} осуществляет подготовку документов для получения лицензии на образовательную деятельность.
                До получения лицензии обучение проводится в формате информационно-консультационных услуг.
              </p>
            </div>
          </div>

          <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
            <div>
              <h2 className="text-white font-bold text-lg mb-3">Статус</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Тип</p>
                  <p className="text-white font-medium">Дополнительное профессиональное образование</p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Статус</p>
                  <p className="text-amber-400 font-medium">В процессе оформления</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">Реквизиты организации</h2>
              <div className="bg-white/[0.03] border border-white/10 p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">ИНН</span>
                  <span className="text-gray-300">{SITE.inn}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between">
                  <span className="text-gray-500">ОГРН</span>
                  <span className="text-gray-300">{SITE.ogrn}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Адрес</span>
                  <span className="text-gray-300">{SITE.address}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">Гарантии качества</h2>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Возврат {COURSE.taxDeduction} стоимости обучения через налоговый вычет
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Гарантия возврата средств в течение {COURSE.returnGuaranteeDays} дней
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Сертификат о прохождении программы (для тарифов Премиум и VIP)
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-xs text-gray-600 font-mono">
            Информация актуальна на 01.06.2026
          </div>
        </div>
      </div>
    </section>
  );
}
