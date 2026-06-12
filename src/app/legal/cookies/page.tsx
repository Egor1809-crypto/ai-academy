import { SITE } from "@/data/content";
import LegalDoc, { H2 } from "@/components/LegalDoc";

export const metadata = {
  title: `Политика использования cookie | ${SITE.name}`,
  description: "Какие файлы cookie использует сайт " + SITE.domain + " и с какой целью.",
};

export default function CookiesPage() {
  return (
    <LegalDoc
      title={<>Политика использования <span className="text-gold">cookie</span></>}
      subtitle="Какие cookie мы используем и зачем"
    >
      <p>
        Сайт {SITE.domain} использует файлы cookie и обрабатывает технические данные (IP-адрес,
        данные о посещении). Согласно позиции Роскомнадзора, cookie вместе с IP-адресом и
        данными о поведении могут относиться к персональным данным, поэтому при первом
        посещении мы запрашиваем ваше согласие на использование необязательных cookie.
      </p>

      <H2>Категории cookie</H2>
      <ul className="space-y-2 ml-4 list-disc">
        <li><strong>Строго необходимые</strong> — нужны для работы сайта и авторизации; согласия не требуют.</li>
        <li><strong>Аналитические</strong> — статистика посещений (используются только при вашем согласии).</li>
        <li><strong>Рекламные</strong> — для рекламных сервисов (используются только при вашем согласии).</li>
      </ul>

      <H2>Используемые cookie</H2>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              <th className="py-2 px-2 font-semibold">Имя</th>
              <th className="py-2 px-2 font-semibold">Назначение</th>
              <th className="py-2 px-2 font-semibold">Срок</th>
              <th className="py-2 px-2 font-semibold">Категория</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2 px-2 font-mono">session</td>
              <td className="py-2 px-2">Авторизация в личном кабинете (httpOnly)</td>
              <td className="py-2 px-2">до 30 дней</td>
              <td className="py-2 px-2">Строго необходимый</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 px-2 font-mono">cookie-consent</td>
              <td className="py-2 px-2">Хранит ваш выбор по cookie-баннеру</td>
              <td className="py-2 px-2">локально в браузере</td>
              <td className="py-2 px-2">Строго необходимый</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>Управление cookie</H2>
      <p>
        Вы можете принять или отклонить необязательные cookie в баннере при первом посещении,
        а также удалить cookie в настройках браузера. Отключение строго необходимых cookie может
        нарушить работу личного кабинета. На текущий момент сайт не использует сторонние
        аналитические и рекламные cookie; при их подключении они будут запускаться только после
        вашего согласия и добавлены в таблицу выше.
      </p>

      <H2>Контакты</H2>
      <p>Оператор: {SITE.operatorFull}. По вопросам — {SITE.email}.</p>
    </LegalDoc>
  );
}
