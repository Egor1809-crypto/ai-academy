import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { COURSE } from "@/data/content";
import LogoutButton from "@/components/LogoutButton";
import CabinetBackground from "@/components/CabinetBackground";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "ailegal_academy_bot";

// Course modules shown in the cabinet. Unlocked once the user has a paid tariff.
const COURSE_MODULES = [
  { num: "01", title: "Введение в нейросети для юристов", lessons: 6 },
  { num: "02", title: "AI в судебно-претензионной работе", lessons: 8 },
  { num: "03", title: "Договорная работа и комплаенс", lessons: 7 },
  { num: "04", title: "Маркетинг и визуал для юриста", lessons: 5 },
];

const PAID_TARIFFS = ["Базовый", "Премиум", "VIP"];

function statusLabel(status: string): { text: string; cls: string } {
  switch (status) {
    case "new":
      return { text: "Новая", cls: "bg-green-500/10 text-green-400 border-green-500/20" };
    case "contacted":
      return { text: "Связались", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "paid":
      return { text: "Оплачено", cls: "bg-gold/10 text-gold border-gold/20" };
    default:
      return { text: status, cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
  }
}

export default async function CabinetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // BUG_FIX_CONTEXT: раньше заявки матчились по OR(email/phone) — но phone/email
  // в модели Lead НЕ уникальны, поэтому при совпадении номера/почты (семья,
  // помощник, опечатка, общий info@) пользователь видел ЧУЖИЕ заявки — утечка ПДн
  // по 152-ФЗ. Ключуем строго по явной связи userId. Чтобы «дозаявки» показывались,
  // Lead.userId нужно проставлять при выдаче доступа/привязке аккаунта, а не
  // матчить по общим контактным полям на чтении.
  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const hasPaidAccess = PAID_TARIFFS.includes(user.tariff ?? "");
  const totalLessons = COURSE_MODULES.reduce((s, m) => s + m.lessons, 0);
  const progressPct = hasPaidAccess ? 0 : 0; // прогресс появится после старта потока
  const initials = (user.name || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-navy-900 text-white relative font-heading">
      {/* фон */}
      <CabinetBackground />
      <div className="absolute inset-0 bg-tech-grid opacity-[0.4] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-gold/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-[420px] h-[420px] bg-cyber-purple/8 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-30 bg-navy-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-sm">
              L
            </div>
            <span className="font-heading font-bold text-lg tracking-wider">
              AI<span className="text-gold">LEGAL</span>
            </span>
            <span className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-white/5 text-gray-400 border border-white/10">
              Кабинет
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gold transition-colors uppercase font-bold tracking-wider"
            >
              На сайт
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Greeting banner */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-navy-800 to-navy-900 p-7 mb-8">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-gold/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-cyber-purple flex items-center justify-center font-heading font-bold text-2xl text-navy-900 shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="font-heading font-bold text-3xl mb-1">
                Привет, {user.name || "друг"}!
              </h1>
              <p className="text-gray-400">
                {hasPaidAccess
                  ? "Доступ к курсу открыт. Рады видеть вас в Академии."
                  : "Добро пожаловать в личный кабинет AI Legal Academy."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                Старт потока
              </p>
              <p className="font-heading font-bold text-gold text-lg">
                {COURSE.startDate}
              </p>
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800 border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Тариф
            </p>
            <p className="font-heading font-bold text-xl text-gold truncate">
              {user.tariff || "Не выбран"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {user.tariff
                ? hasPaidAccess
                  ? "Доступ открыт"
                  : "Ожидает оплаты"
                : "Выберите на сайте"}
            </p>
          </div>
          <div className="bg-navy-800 border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Прогресс
            </p>
            <p className="font-heading font-bold text-xl">{progressPct}%</p>
            <div className="mt-2 h-1.5 bg-navy-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold to-cyber-purple rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="bg-navy-800 border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Модулей
            </p>
            <p className="font-heading font-bold text-xl">{COURSE_MODULES.length}</p>
            <p className="text-xs text-gray-500 mt-1">{totalLessons} уроков</p>
          </div>
          <div className="bg-navy-800 border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Мои заявки
            </p>
            <p className="font-heading font-bold text-xl">{leads.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {leads.length === 0 ? "пока нет" : "в обработке"}
            </p>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Materials */}
            <section className="bg-navy-800 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading font-bold text-lg">Программа курса</h2>
                {hasPaidAccess ? (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    Доступ открыт
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
                    Заблокировано
                  </span>
                )}
              </div>

              <ul className="space-y-3">
                {COURSE_MODULES.map((m) => (
                  <li
                    key={m.num}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      hasPaidAccess
                        ? "bg-navy-900 border-white/5 hover:border-gold/30"
                        : "bg-navy-900/50 border-white/5"
                    }`}
                  >
                    <span className="text-gold text-sm w-7 shrink-0">
                      {m.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          hasPaidAccess ? "text-gray-100" : "text-gray-400"
                        }`}
                      >
                        {m.title}
                      </p>
                      <p className="text-xs text-gray-500">{m.lessons} уроков</p>
                    </div>
                    {hasPaidAccess ? (
                      <span className="text-[10px] uppercase tracking-wider text-green-400 font-bold shrink-0">
                        Доступно
                      </span>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-600 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </li>
                ))}
              </ul>

              {!hasPaidAccess && (
                <div className="mt-5 p-4 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-gray-300">
                    Оформите тариф — и материалы откроются здесь.
                  </p>
                  <Link
                    href="/#tariffs"
                    className="px-5 py-2.5 bg-gold text-navy-900 font-bold uppercase text-xs rounded-lg hover:bg-gold-light transition-colors shrink-0"
                  >
                    Выбрать тариф
                  </Link>
                </div>
              )}
            </section>

            {/* My applications */}
            <section className="bg-navy-800 border border-white/10 rounded-xl p-6">
              <h2 className="font-heading font-bold text-lg mb-4">Мои заявки</h2>
              {leads.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Заявок пока нет. Оставьте заявку на курс на главной странице.
                  </p>
                  <Link
                    href="/#tariffs"
                    className="inline-block px-5 py-2.5 border border-white/15 text-white font-bold uppercase text-xs rounded-lg hover:border-gold hover:text-gold transition-colors"
                  >
                    Оставить заявку
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map((lead) => {
                    const st = statusLabel(lead.status);
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between gap-3 p-4 bg-navy-900 rounded-lg border border-white/5"
                      >
                        <div>
                          <p className="text-sm font-medium">{lead.tariff}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${st.cls}`}
                        >
                          {st.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Profile */}
            <section className="bg-navy-800 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-lg">Профиль</h2>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-white/5 text-gray-400">
                  {user.role === "admin" ? "Админ" : "Студент"}
                </span>
              </div>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Имя</dt>
                  <dd className="text-gray-100">{user.name || "—"}</dd>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Email</dt>
                  <dd className="text-gray-100 break-all">{user.email || "—"}</dd>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Телефон</dt>
                  <dd className="text-gray-100">{user.phone || "—"}</dd>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Telegram</dt>
                  <dd className="text-gray-100 flex items-center gap-2">
                    {user.telegramUsername ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />@
                        {user.telegramUsername}
                      </>
                    ) : user.telegramId ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        привязан
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        не привязан
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Curator */}
            <section className="bg-gradient-to-br from-navy-800 to-navy-900 border border-white/10 rounded-xl p-6">
              <h2 className="font-heading font-bold text-lg mb-2">Связь с куратором</h2>
              <p className="text-gray-400 text-sm mb-4">
                Вопросы по курсу, оплате или доступу — напишите нам в Telegram, ответим
                быстро.
              </p>
              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#229ED9] text-white font-bold rounded-lg hover:bg-[#1d8ec2] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Написать в Telegram
              </a>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
