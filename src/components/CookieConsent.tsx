"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Cookie-баннер по требованиям РКН (152-ФЗ): РКН трактует cookies + IP +
 * поведенческие данные как персональные. Баннер показывается при первом заходе
 * ДО установки любых необязательных cookies, даёт равноправный выбор
 * «Принять» / «Отклонить» и ссылается на политику cookies и политику ПДн.
 *
 * Сейчас сайт не подключает сторонние метрики/пиксели — строго необходимый
 * httpOnly-cookie сессии ставится только при входе в личный кабинет и согласия
 * не требует. Выбор пользователя сохраняется в localStorage; при подключении
 * аналитики её скрипты должны запускаться ТОЛЬКО при значении "accepted".
 */
const STORAGE_KEY = "cookie-consent";

export function getCookieConsent(): "accepted" | "rejected" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* localStorage может быть недоступен — баннер просто закроется */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookies"
      className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-5 animate-slideUp"
    >
      <div className="max-w-4xl mx-auto bg-navy-800/95 backdrop-blur border border-gold/20 shadow-[0_0_40px_rgba(0,207,255,0.12)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4">
        <p className="text-gray-300 text-sm leading-relaxed flex-1">
          Мы используем cookies и обрабатываем технические данные (IP-адрес, данные о
          посещении) для работы сайта и улучшения сервиса. Продолжая, вы соглашаетесь
          с этим. Подробнее — в{" "}
          <Link href="/legal/cookies" className="text-gold/80 hover:text-gold underline underline-offset-2">
            Политике cookies
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy" className="text-gold/80 hover:text-gold underline underline-offset-2">
            Политике конфиденциальности
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => choose("rejected")}
            className="flex-1 md:flex-none px-5 py-2.5 border border-white/20 text-white text-sm font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-pointer"
          >
            Отклонить
          </button>
          <button
            onClick={() => choose("accepted")}
            className="flex-1 md:flex-none px-5 py-2.5 bg-gold text-navy-900 text-sm font-bold uppercase tracking-wide hover:bg-gold-light transition-colors cursor-pointer"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
