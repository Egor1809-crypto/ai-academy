"use client";

// FILE: src/components/AccountDataSection.tsx
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: UI прав субъекта ПДн в кабинете (ст.14, ч.2 ст.9 152-ФЗ): выгрузка данных,
//          отзыв/выдача маркетингового согласия, удаление аккаунта с подтверждением.
// SCOPE: Клиентский компонент; дергает /api/account/{export,consent,erase}.
// INPUT: initialMarketingConsent — текущее состояние согласия.
// OUTPUT: JSX-секция «Мои данные».
// KEYWORDS: DOMAIN(9): SubjectRights; CONCEPT(7): SelfService; TECH(7): React, NextRouter
// LINKS: USES_API(9): /api/account/*
// END_MODULE_CONTRACT

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountDataSection({
  initialMarketingConsent,
}: {
  initialMarketingConsent: boolean;
}) {
  const router = useRouter();
  const [marketing, setMarketing] = useState(initialMarketingConsent);
  const [savingConsent, setSavingConsent] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState("");

  const toggleMarketing = async () => {
    const next = !marketing;
    setSavingConsent(true);
    setError("");
    // Оптимистично переключаем, откатываем при ошибке.
    setMarketing(next);
    try {
      const res = await fetch("/api/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingConsent: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMarketing(!next);
        setError(data.error || "Не удалось сохранить выбор.");
      } else {
        setMarketing(data.marketingConsent);
      }
    } catch {
      setMarketing(!next);
      setError("Не удалось связаться с сервером.");
    } finally {
      setSavingConsent(false);
    }
  };

  const eraseAccount = async () => {
    setErasing(true);
    setError("");
    try {
      const res = await fetch("/api/account/erase", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Не удалось удалить аккаунт.");
        setErasing(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером.");
      setErasing(false);
    }
  };

  return (
    <section className="bg-navy-800 border border-white/10 rounded-xl p-6">
      <h2 className="text-lg mb-1" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 700, textTransform: "none" }}>Мои данные</h2>
      <p className="text-gray-500 text-xs mb-5">
        Управление персональными данными по 152-ФЗ: доступ, согласие, удаление.
      </p>

      {/* Маркетинговое согласие */}
      <div className="flex items-start justify-between gap-3 py-3 border-t border-white/5">
        <div className="min-w-0">
          <p className="text-gray-100 text-sm font-medium">Рекламные сообщения</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Новости курса и предложения. Можно отключить в любой момент — на доступ к
            услуге это не влияет.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={marketing}
          aria-label="Рекламные сообщения"
          disabled={savingConsent}
          onClick={toggleMarketing}
          className={`relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 ${
            marketing ? "bg-gold/80" : "bg-white/15"
          } ${savingConsent ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
              marketing ? "translate-x-4" : ""
            }`}
          />
        </button>
      </div>

      {/* Выгрузка данных */}
      <div className="flex items-center justify-between gap-3 py-3 border-t border-white/5">
        <div className="min-w-0">
          <p className="text-gray-100 text-sm font-medium">Выгрузить мои данные</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Все данные вашего аккаунта одним JSON-файлом.
          </p>
        </div>
        <a
          href="/api/account/export"
          className="shrink-0 px-4 py-2 border border-white/15 text-gray-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Скачать
        </a>
      </div>

      {/* Удаление аккаунта */}
      <div className="py-3 border-t border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-gray-100 text-sm font-medium">Удалить аккаунт</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Аккаунт и связанные заявки будут удалены без возможности восстановления.
            </p>
          </div>
          {!confirmErase && (
            <button
              type="button"
              onClick={() => setConfirmErase(true)}
              className="shrink-0 px-4 py-2 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              Удалить
            </button>
          )}
        </div>

        {confirmErase && (
          <div className="mt-3 p-4 rounded-lg bg-red-500/[0.06] border border-red-500/20">
            <p className="text-sm text-gray-200 mb-3">
              Точно удалить аккаунт? Это действие необратимо.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmErase(false)}
                disabled={erasing}
                className="px-4 py-2 border border-white/15 text-gray-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:border-white/35 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={eraseAccount}
                disabled={erasing}
                className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {erasing ? "Удаляем…" : "Да, удалить"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </section>
  );
}
