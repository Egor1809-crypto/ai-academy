"use client";

import { useState } from "react";

interface Props {
  tariff: string;
  onClose: () => void;
}

export default function RegistrationModal({ tariff, onClose }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Введите ваше имя");
      return;
    }
    if (!form.phone.trim() || !validatePhone(form.phone)) {
      setError("Введите корректный номер телефона");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tariff }),
      });
      if (!res.ok) throw new Error("Ошибка отправки");
      setSuccess(true);
    } catch {
      setError("Произошла ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-navy-800 border border-gold/20 p-8 max-w-md w-full shadow-[0_0_60px_rgba(0,207,255,0.1)] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Закрыть"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-2xl mb-3">Заявка отправлена!</h3>
            <p className="text-gray-400 mb-6">Мы свяжемся с вами в ближайшее время для подтверждения записи.</p>
            <button
              onClick={onClose}
              className="px-8 py-3 border border-white/20 text-white font-bold uppercase text-sm hover:bg-white hover:text-navy-900 transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="font-heading font-bold text-2xl mb-2">Регистрация</h3>
              <p className="text-gray-400 text-sm">
                Тариф: <span className="text-gold font-bold">{tariff}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-mono mb-1.5">
                  Имя *
                </label>
                <input
                  type="text"
                  placeholder="Как к вам обращаться"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-mono mb-1.5">
                  Телефон *
                </label>
                <input
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-mono mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider font-mono mb-1.5">
                  Комментарий
                </label>
                <textarea
                  placeholder="Вопросы или пожелания"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={2}
                  className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-gold focus:outline-none transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/20 px-3 py-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gold text-navy-900 font-bold uppercase text-sm hover:bg-gold-light transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(0,207,255,0.2)] hover:shadow-[0_0_30px_rgba(0,207,255,0.4)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Отправка...
                  </span>
                ) : (
                  "Отправить заявку"
                )}
              </button>

              <p className="text-[10px] text-gray-600 text-center">
                Нажимая кнопку, вы соглашаетесь с{" "}
                <a href="#" className="text-gold/60 hover:text-gold underline underline-offset-2">
                  политикой конфиденциальности
                </a>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
