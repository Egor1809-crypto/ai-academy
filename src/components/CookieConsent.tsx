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
      className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-4 sm:bottom-4 z-[200] sm:max-w-[340px] animate-slideUp"
    >
      <div className="relative bg-navy-800/95 backdrop-blur-md border border-gold/25 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-4">
        {/* Уголок-акцент в фирменном стиле */}
        <svg className="absolute top-0 left-0 w-4 h-4 text-gold/50" viewBox="0 0 16 16" fill="none">
          <path d="M0 6 L0 0 L6 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="flex items-start gap-2.5 mb-3">
          <span className="shrink-0 mt-0.5 text-lg leading-none" aria-hidden>
            🍪
          </span>
          <p className="text-gray-300 text-xs leading-relaxed">
            Используем cookies и технические данные (IP, посещения) для работы сайта.
            Подробнее —{" "}
            <Link href="/legal/cookies" className="text-gold/80 hover:text-gold underline underline-offset-2">
              cookies
            </Link>{" "}
            и{" "}
            <Link href="/legal/privacy" className="text-gold/80 hover:text-gold underline underline-offset-2">
              конфиденциальность
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => choose("rejected")}
            className="flex-1 px-3 py-2 border border-white/20 text-white text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-pointer rounded-md"
          >
            Отклонить
          </button>
          <button
            onClick={() => choose("accepted")}
            className="flex-1 px-3 py-2 bg-gold text-navy-900 text-xs font-bold uppercase tracking-wide hover:bg-gold-light transition-colors cursor-pointer rounded-md"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
