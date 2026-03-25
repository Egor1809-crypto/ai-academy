"use client";

import { useState } from "react";

interface Props {
  tariff: string;
  onClose: () => void;
}

export default function RegistrationModal({ tariff, onClose }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Заполните имя и телефон");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-navy-800 border border-gold/30 p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl cursor-pointer">
          &times;
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-2xl mb-2">Заявка отправлена!</h3>
            <p className="text-gray-400">Мы свяжемся с вами в ближайшее время.</p>
          </div>
        ) : (
          <>
            <h3 className="font-heading font-bold text-2xl mb-2">Регистрация</h3>
            <p className="text-gray-400 text-sm mb-6">
              Тариф: <span className="text-gold font-bold">{tariff}</span>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Ваше имя *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors"
              />
              <input
                type="tel"
                placeholder="Телефон *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-navy-900 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gold text-navy-900 font-bold uppercase text-sm hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Отправка..." : "Отправить заявку"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
