"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthDecor from "./AuthDecor";

type Method = "email" | "telegram" | "phone";

export default function AuthForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");

  // — Email + пароль —
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState("");

  // — Telegram —
  const [tgPending, setTgPending] = useState(false);
  const [tgError, setTgError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEmailError("");
      setEmailPending(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setEmailError(data.error || "Не удалось войти.");
          setEmailPending(false);
          return;
        }
        router.push("/cabinet");
        router.refresh();
      } catch {
        setEmailError("Не удалось связаться с сервером.");
        setEmailPending(false);
      }
    },
    [email, password, router],
  );

  const handleTelegram = useCallback(async () => {
    setTgError("");
    setTgPending(true);
    try {
      const res = await fetch("/api/auth/telegram/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.deepLink || !data.code) {
        setTgError(data.error || "Не удалось начать вход через Telegram.");
        setTgPending(false);
        return;
      }

      window.open(data.deepLink, "_blank", "noopener,noreferrer");

      const code: string = data.code;
      const startedAt = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > 180_000) {
          if (pollRef.current) clearInterval(pollRef.current);
          setTgPending(false);
          setTgError("Время ожидания истекло. Попробуйте снова.");
          return;
        }
        try {
          const sres = await fetch(
            `/api/auth/telegram/status?code=${encodeURIComponent(code)}`,
          );
          const sdata = await sres.json();
          if (sdata.status === "confirmed") {
            if (pollRef.current) clearInterval(pollRef.current);
            router.push("/cabinet");
            router.refresh();
          } else if (sdata.status === "expired" || sdata.status === "notfound") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTgPending(false);
            setTgError("Сессия входа истекла. Попробуйте снова.");
          }
        } catch {
          /* keep polling */
        }
      }, 2000);
    } catch {
      setTgPending(false);
      setTgError("Не удалось связаться с сервером.");
    }
  }, [router]);

  const tabBase =
    "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer";

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 py-12 relative overflow-hidden">
      {/* фирменный гжель-хологрма-фон */}
      <div className="absolute inset-0 bg-tech-grid opacity-[0.35] pointer-events-none" />
      <AuthDecor />
      {/* фоновые блики */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[360px] h-[360px] bg-cyber-purple/8 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold flex items-center justify-center font-heading font-bold text-navy-900 text-lg">
            L
          </div>
          <span className="font-heading font-bold text-xl tracking-wider text-white">
            AI<span className="text-gold">LEGAL</span>
          </span>
        </Link>

        <div className="relative bg-navy-800 border border-white/10 p-5 md:p-8 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <span className="hud-corner-tl" />
          <span className="hud-corner-br" />
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 text-center mb-2">
            Личное дело
          </p>
          <h1 className="font-heading font-bold text-2xl mb-1 text-white text-center">
            Вход в кабинет
          </h1>
          <p className="text-gray-400 text-sm text-center mb-6">
            Продолжим работу с того места, где вы остановились
          </p>

          {/* Переключатель способов */}
          <div className="flex gap-1.5 p-1 bg-navy-900 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`${tabBase} ${
                method === "email"
                  ? "bg-gold text-navy-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMethod("telegram")}
              className={`${tabBase} ${
                method === "telegram"
                  ? "bg-[#229ED9] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Telegram
            </button>
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={`${tabBase} ${
                method === "phone"
                  ? "bg-cyber-purple text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Телефон
            </button>
          </div>

          {/* — Email + пароль — */}
          {method === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-mono mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-navy-900 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-mono mb-1.5">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-navy-900 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-xs text-center">{emailError}</p>
              )}
              <button
                type="submit"
                disabled={emailPending}
                className="w-full py-3.5 bg-gold text-navy-900 font-bold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-60 cursor-pointer uppercase tracking-wider text-sm"
              >
                {emailPending ? "Входим…" : "Войти"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Доступ выдаёт куратор после оплаты. Забыли пароль —{" "}
                <Link href="/#tariffs" className="text-gold hover:text-gold-light">
                  напишите нам
                </Link>
                .
              </p>
            </form>
          )}

          {/* — Telegram — */}
          {method === "telegram" && (
            <div>
              <button
                type="button"
                onClick={handleTelegram}
                disabled={tgPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#229ED9] text-white font-bold rounded-lg hover:bg-[#1d8ec2] transition-colors disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                {tgPending ? "Ожидаем подтверждения…" : "Войти через Telegram"}
              </button>
              {tgPending && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Откройте бота, нажмите «Старт» — и вернитесь сюда.
                </p>
              )}
              {tgError && (
                <p className="text-red-400 text-xs text-center mt-3">{tgError}</p>
              )}
              <p className="text-xs text-gray-500 text-center mt-4">
                Быстрый вход без пароля — через нашего бота.
              </p>
            </div>
          )}

          {/* — Телефон (SMS) — пока в разработке — */}
          {method === "phone" && (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyber-purple/15 mb-3">
                <svg className="w-6 h-6 text-cyber-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-bold mb-1">Вход по SMS — скоро</p>
              <p className="text-gray-400 text-sm mb-4">
                Готовим вход по номеру телефона с кодом из SMS. Пока используйте
                Email или Telegram.
              </p>
              <button
                type="button"
                onClick={() => setMethod("telegram")}
                className="text-gold hover:text-gold-light text-sm font-bold"
              >
                Войти через Telegram →
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-sm text-gray-400">
              Ещё не с нами?{" "}
              <Link href="/#tariffs" className="text-gold hover:text-gold-light">
                Оставьте заявку
              </Link>{" "}
              — мы свяжемся и откроем доступ.
            </p>
            <p className="mt-3 text-[11px] text-gray-600">
              Выполняя вход, вы соглашаетесь с{" "}
              <Link href="/legal/privacy" className="text-gold/70 hover:text-gold underline underline-offset-2">
                политикой конфиденциальности
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
