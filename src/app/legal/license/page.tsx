import { SITE, COURSE } from "@/data/content";
import LegalDoc, { H2 } from "@/components/LegalDoc";

export const metadata = {
  title: `Лицензия | ${SITE.name}`,
  description:
    "Сведения о статусе образовательной деятельности AI Legal Academy и условиях применимости социального налогового вычета.",
};

export default function LicensePage() {
  return (
    <LegalDoc
      title={
        <>
          Сведения об <span className="text-gold">образовательной деятельности</span>
        </>
      }
      subtitle="Статус лицензирования и условия применимости налогового вычета"
    >
      {/* Статус-баннер: текущий правовой статус услуги */}
      <div className="bg-gold/10 border border-gold/30 px-5 py-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-gold shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-gold font-medium text-sm mb-1">Лицензия в процессе оформления</p>
          <p className="text-gray-400 text-xs">
            {SITE.operatorFull} осуществляет подготовку документов для получения лицензии на
            осуществление образовательной деятельности. До получения лицензии услуги по программе
            «{COURSE.title}» оказываются в формате информационно-консультационных услуг и не
            являются образовательной деятельностью, подлежащей лицензированию по Федеральному закону
            от 29.12.2012 № 273-ФЗ «Об образовании в Российской Федерации».
          </p>
        </div>
      </div>

      <H2>1. Правовой статус услуги</H2>
      <p>
        {SITE.operatorFull} (далее — «Исполнитель», «Оператор») оказывает Заказчику услуги по
        программе «{COURSE.title}». На текущую дату услуги предоставляются как
        информационно-консультационные: они направлены на передачу практических навыков и не
        сопровождаются выдачей документов об образовании и (или) о квалификации государственного
        образца. Порядок и условия оказания услуг определяются{" "}
        <a
          href="/legal/offer"
          className="text-gold/70 hover:text-gold underline underline-offset-2"
        >
          Договором публичной оферты
        </a>
        . Правовой статус услуги будет изменён на образовательную деятельность после получения
        Исполнителем соответствующей лицензии; о таком изменении будет указано в настоящем документе
        и в Договоре оферты.
      </p>

      <H2>2. Статус лицензирования</H2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">
            Текущий формат услуги
          </p>
          <p className="text-white font-medium">Информационно-консультационные услуги</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 p-4">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">
            Статус лицензии
          </p>
          <p className="text-amber-400 font-medium">В процессе оформления</p>
        </div>
      </div>

      <H2>3. Реквизиты организации</H2>
      <div className="bg-white/[0.03] border border-white/10 p-4 space-y-2 font-mono text-xs not-prose">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Оператор</span>
          <span className="text-gray-300 text-right">{SITE.operator}</span>
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">ИНН</span>
          <span className="text-gray-300 text-right">{SITE.inn}</span>
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">КПП</span>
          <span className="text-gray-300 text-right">{SITE.kpp}</span>
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">ОГРН</span>
          <span className="text-gray-300 text-right">{SITE.ogrn}</span>
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Адрес</span>
          <span className="text-gray-300 text-right">{SITE.address}</span>
        </div>
      </div>

      <H2>4. Социальный налоговый вычет 13%</H2>
      <p>
        Социальный налоговый вычет по расходам на обучение в размере {COURSE.taxDeduction} (подпункт
        2 пункта 1 статьи 219 Налогового кодекса Российской Федерации) предоставляется
        налогоплательщику при обучении в организации, осуществляющей образовательную деятельность и
        имеющей соответствующую лицензию. Поскольку на текущую дату услуги оказываются в формате
        информационно-консультационных, а лицензия на образовательную деятельность находится в
        стадии оформления, право на указанный вычет возникает у Заказчика не ранее получения
        Исполнителем лицензии и оформления услуг как образовательных. До этого момента возможность
        применения вычета {COURSE.taxDeduction} не гарантируется. Актуальный статус лицензии
        рекомендуется уточнять у Исполнителя по адресу {SITE.email} до оплаты.
      </p>

      <H2>5. Гарантии Исполнителя</H2>
      <ul className="space-y-2 ml-4 list-disc">
        <li>
          возврат оплаченной суммы в течение {COURSE.returnGuaranteeDays} календарных дней с момента
          начала обучения на условиях{" "}
          <a
            href="/legal/offer"
            className="text-gold/70 hover:text-gold underline underline-offset-2"
          >
            Договора оферты
          </a>
          ;
        </li>
        <li>
          выдача сертификата о прохождении программы (для тарифов «Премиум» и «VIP»); сертификат
          подтверждает факт прохождения программы и не является документом об образовании
          государственного образца;
        </li>
        <li>
          применение социального налогового вычета {COURSE.taxDeduction} — на условиях раздела 4
          настоящего документа.
        </li>
      </ul>

      <H2>6. Обращения и разъяснения</H2>
      <p>
        За разъяснениями относительно статуса лицензии и условий оказания услуг Заказчик вправе
        обратиться к Исполнителю по адресу электронной почты {SITE.email} либо по телефону{" "}
        {SITE.phone}. Актуальная редакция настоящего документа размещена по адресу{" "}
        https://{SITE.domain}/legal/license.
      </p>
    </LegalDoc>
  );
}
