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
 *
 * Дизайн: фирменный язык «Досье» — HUD-уголки, serif-заголовок (Lora),
 * мономётка юриста, иконка-щит, бликующий хайрлайн и шайн-свип на «Принять».
 * Эффекты намеренно сдержанные — аудитория юристы, нужна солидность.
 */
const STORAGE_KEY = "cookie-consent";

export function getCookieConsent(): "accepted" | "rejected" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* localStorage может быть недоступен — баннер просто закроется */
    }
    // Мягкий выход, затем размонтирование.
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 240);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookies"
      className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-5 sm:bottom-5 z-[200] sm:max-w-[384px]"
    >
      <div
        className={`relative dossier-card border border-gold/30 rounded-md backdrop-blur-xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7),0_0_46px_-10px_rgba(0,207,255,0.22)] ${
          leaving
            ? "opacity-0 translate-y-2 transition-all duration-200 ease-out"
            : "animate-module-in"
        }`}
      >
        {/* HUD-уголки «дела» */}
        <span className="hud-corner-tl" />
        <span className="hud-corner-br" />

        {/* Верхний хайрлайн с медленным бликом */}
        <div className="absolute top-0 inset-x-0 h-px overflow-hidden rounded-t-md">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
          <div
            className="absolute top-0 left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-gold-light to-transparent"
            style={{ animation: "sweep-x 3.4s ease-in-out infinite" }}
          />
        </div>

        <div className="p-4 sm:p-5">
          {/* Шапка: печать-щит + мономётка + serif-заголовок */}
          <div className="flex items-center gap-3 mb-3">
            <span className="relative shrink-0 w-9 h-9 flex items-center justify-center border border-gold/30 bg-gold/[0.06]">
              <span className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-gold/70" />
              <span className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-gold/70" />
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-gold"
                aria-hidden
              >
                <path
                  d="M12 2.5 L19.5 5.2 V11 C19.5 15.8 16.2 19.2 12 21.3 C7.8 19.2 4.5 15.8 4.5 11 V5.2 Z"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path d="M8.6 12 L11 14.4 L15.6 9.2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="dossier-margin leading-none mb-1.5">Политика данных · 152-ФЗ</p>
              <h3 className="font-serif-display text-white text-lg leading-none">Конфиденциальность</h3>
            </div>
          </div>

          {/* Текст уведомления */}
          <p className="text-gray-400 text-[13px] leading-relaxed mb-4">
            Используем cookies и технические данные (IP, посещения) для работы сайта.
            Без передачи третьим лицам. Подробнее —{" "}
            <Link
              href="/legal/cookies"
              className="text-gold/90 hover:text-gold underline underline-offset-2 decoration-gold/40 transition-colors"
            >
              Политика cookies
            </Link>{" "}
            и{" "}
            <Link
              href="/legal/privacy"
              className="text-gold/90 hover:text-gold underline underline-offset-2 decoration-gold/40 transition-colors"
            >
              конфиденциальности
            </Link>
            .
          </p>

          {/* Тонкий разделитель */}
          <div className="h-px bg-gradient-to-r from-gold/25 via-white/5 to-transparent mb-4" />

          {/* Равноправные кнопки (требование РКН) */}
          <div className="flex gap-2.5">
            <button
              onClick={() => choose("rejected")}
              className="flex-1 px-4 py-2.5 border border-white/15 text-gray-200 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] hover:border-white/35 hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              Отклонить
            </button>
            <button
              onClick={() => choose("accepted")}
              className="group relative flex-1 overflow-hidden px-4 py-2.5 bg-gold text-navy-900 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] glow-gold-hover transition-shadow cursor-pointer"
            >
              <span className="relative z-10">Принять</span>
              {/* Шайн-свип по наведению */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
