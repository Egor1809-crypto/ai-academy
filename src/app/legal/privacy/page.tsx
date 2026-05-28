import { SITE, COURSE } from "@/data/content";

export const metadata = {
  title: `Политика конфиденциальности | ${SITE.name}`,
  description: "Политика обработки персональных данных AI Legal Academy.",
};

export default function PrivacyPage() {
  return (
    <section className="py-28 bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute top-1/3 left-1/2 w-[600px] h-[400px] bg-cyber-purple/5 rounded-full blur-[200px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 mb-6">
            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Юридический документ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Политика <span className="text-gold">конфиденциальности</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Обработка и защита персональных данных
          </p>
        </div>

        {/* Document body */}
        <div className="bg-white/[0.02] border border-white/10 p-8 md:p-12 space-y-8">
          {/* Status banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-amber-400 font-medium text-sm mb-1">Документ в подготовке</p>
              <p className="text-gray-400 text-xs">
                Полная версия политики конфиденциальности будет опубликована до {COURSE.startDate}. Текущая версия является предварительной.
              </p>
            </div>
          </div>

          <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
            <div>
              <h2 className="text-white font-bold text-lg mb-3">1. Сбор информации</h2>
              <p>
                {SITE.fullName} (далее — «Оператор») собирает и обрабатывает персональные данные пользователей
                в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».
              </p>
              <p className="mt-3">
                Мы собираем: имя, номер телефона, адрес электронной почты — исключительно для обработки
                заявок на обучение и информирования о курсе.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">2. Использование данных</h2>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Обработка заявок на обучение
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Связь с пользователем по вопросам курса
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Информирование о расписании и обновлениях программы
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                  Улучшение качества образовательных услуг
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">3. Защита данных</h2>
              <p>
                Оператор принимает все необходимые организационные и технические меры для защиты персональных данных
                от несанкционированного доступа, изменения, раскрытия или уничтожения.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">4. Права пользователя</h2>
              <p>
                Вы вправе в любой момент потребовать удаления ваших персональных данных, направив запрос
                на {SITE.email}. Данные будут удалены в течение 30 рабочих дней.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg mb-3">5. Контакты</h2>
              <p>
                По вопросам обработки персональных данных:<br />
                Email: {SITE.email}<br />
                Телефон: {SITE.phone}<br />
                Адрес: {SITE.address}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-xs text-gray-600 font-mono">
            Редакция от 01.06.2026 · В соответствии с 152-ФЗ
          </div>
        </div>
      </div>
    </section>
  );
}
