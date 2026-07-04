"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE } from "@/data/content";

/**
 * Cookie-баннер по требованиям РКН (152-ФЗ/149-ФЗ): cookies + IP + поведенческие
 * данные трактуются как персональные. Баннер показывается при первом заходе ДО
 * установки любых необязательных cookies, даёт равноправный выбор и гранулярную
 * настройку категорий, фиксирует выбор (дата + версия политики).
 *
 * Категории: «Необходимые» — всегда включены (сессия/безопасность, согласия не
 * требуют). «Аналитика» и «Маркетинг» — по умолчанию ВЫКЛЮЧЕНЫ; их скрипты (если
 * появятся) должны запускаться ТОЛЬКО при соответствующем true в getCookieConsent().
 *
 * Дизайн: фирменный язык «Досье» — HUD-уголки, serif-заголовок, иконка-щит.
 */
const STORAGE_KEY = "cookie-consent";
// A7: версия документов — из единого источника SITE, а не хардкод. Так
// зафиксированная в согласии версия однозначно соответствует опубликованному тексту.
const POLICY_VERSION = SITE.legalVersion;

export interface CookieConsentValue {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
  v: string;
}

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "analytics" in parsed) {
      return parsed as CookieConsentValue;
    }
    return null;
  } catch {
    return null;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  const persist = (a: boolean, m: boolean) => {
    const value: CookieConsentValue = {
      necessary: true,
      analytics: a,
      marketing: m,
      ts: new Date().toISOString(),
      v: POLICY_VERSION,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* localStorage недоступен — баннер просто закроется */
    }
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 240);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
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
        <span className="hud-corner-tl" />
        <span className="hud-corner-br" />

        <div className="absolute top-0 inset-x-0 h-px overflow-hidden rounded-t-md">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
          <div
            className="absolute top-0 left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-gold-light to-transparent"
            style={{ animation: "sweep-x 3.4s ease-in-out infinite" }}
          />
        </div>

        <div className="p-4 sm:p-5">
          {/* Шапка */}
          <div className="flex items-center gap-3 mb-3">
            <span className="relative shrink-0 w-9 h-9 flex items-center justify-center border border-gold/30 bg-gold/[0.06]">
              <span className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-gold/70" />
              <span className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-gold/70" />
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gold" aria-hidden>
                <path d="M12 2.5 L19.5 5.2 V11 C19.5 15.8 16.2 19.2 12 21.3 C7.8 19.2 4.5 15.8 4.5 11 V5.2 Z" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M8.6 12 L11 14.4 L15.6 9.2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="dossier-margin leading-none mb-1.5">Политика данных · 152-ФЗ</p>
              <h3 className="font-serif-display text-white text-lg leading-none">Конфиденциальность</h3>
            </div>
          </div>

          {!showSettings ? (
            <>
              <p className="text-gray-400 text-[13px] leading-relaxed mb-4">
                Используем cookies и технические данные (IP, посещения) для работы сайта.
                Для отдельных функций — вход через Telegram и AI-ассистент — данные
                могут передаваться привлечённым лицам и иностранному поставщику ИИ.
                Подробнее —{" "}
                <Link href="/legal/cookies" className="text-gold/90 hover:text-gold underline underline-offset-2 decoration-gold/40 transition-colors">
                  Политика cookies
                </Link>{" "}
                и{" "}
                <Link href="/legal/privacy" className="text-gold/90 hover:text-gold underline underline-offset-2 decoration-gold/40 transition-colors">
                  конфиденциальности
                </Link>
                .
              </p>

              <div className="h-px bg-gradient-to-r from-gold/25 via-white/5 to-transparent mb-4" />

              <div className="flex flex-col gap-2">
                <div className="flex gap-2.5">
                  <button
                    onClick={() => persist(false, false)}
                    className="flex-1 px-4 py-2.5 border border-white/15 text-gray-200 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] hover:border-white/35 hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => persist(true, true)}
                    className="group relative flex-1 overflow-hidden px-4 py-2.5 bg-gold text-navy-900 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] glow-gold-hover transition-shadow cursor-pointer"
                  >
                    <span className="relative z-10">Принять</span>
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  </button>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-[11px] font-mono uppercase tracking-widest text-gray-400 hover:text-gold transition-colors py-1 cursor-pointer"
                >
                  Настроить категории
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                <CookieRow label="Необходимые" desc="Сессия и безопасность. Всегда включены." checked disabled />
                <CookieRow
                  label="Аналитика"
                  desc="Помогает улучшать сайт. Сейчас не используется."
                  checked={analytics}
                  onChange={() => setAnalytics((v) => !v)}
                />
                <CookieRow
                  label="Маркетинг"
                  desc="Реклама и ретаргетинг. Сейчас не используется."
                  checked={marketing}
                  onChange={() => setMarketing((v) => !v)}
                />
              </div>

              <div className="h-px bg-gradient-to-r from-gold/25 via-white/5 to-transparent mb-4" />

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2.5 border border-white/15 text-gray-200 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] hover:border-white/35 hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  Назад
                </button>
                <button
                  onClick={() => persist(analytics, marketing)}
                  className="flex-1 px-4 py-2.5 bg-gold text-navy-900 text-xs font-heading font-bold uppercase tracking-widest rounded-[3px] glow-gold-hover transition-shadow cursor-pointer"
                >
                  Сохранить выбор
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Строка категории cookie с тумблером. */
function CookieRow({
  label,
  desc,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-white text-[13px] font-heading font-bold leading-tight">{label}</p>
        <p className="text-gray-500 text-[11px] leading-snug">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? "bg-gold/80" : "bg-white/15"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}
