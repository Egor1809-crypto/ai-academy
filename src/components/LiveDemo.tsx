"use client";

import { useState, useRef, useEffect } from "react";
import ScrollReveal from "./ScrollReveal";

/**
 * Живое демо AI-юриста на главной. Дифференциатор: вместо обещаний — реальный
 * запрос к нашему же `/api/chat` (тот, что питает чат Маняши). Посетитель вводит
 * задачу (или берёт пресет-боль) и сразу видит ответ AI. Паттерн Spellbook/Legora
 * («покажи продукт»), но живьём, а не скриншотом.
 *
 * Безопасность: демо гоняет тот же rate-limit (15/мин) и предупреждение о ПДн.
 */
const PRESETS = [
  "Проанализируй договор аренды: какие риски для арендатора?",
  "Составь структуру ответа на претензию по качеству товара",
  "Подбери аргументы для взыскания неустойки по 395 ГК РФ",
  "Сделай чек-лист проверки контрагента перед сделкой",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// B3 (152-ФЗ, ст.12): общий с виджетом Маняши ключ явного согласия на передачу
// текста стороннему AI-сервису. Согласие, данное в одном месте, действует и здесь.
const LS_AI_CONSENT = "ai-chat-consent";

export default function LiveDemo() {
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // B3: факт явного согласия на AI-обработку; персистится в localStorage.
  const [aiConsent, setAiConsent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread, loading]);

  // B3: восстанавливаем ранее данное согласие (общий ключ с виджетом Маняши).
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_AI_CONSENT) === "1") setAiConsent(true);
    } catch {
      /* ignore */
    }
  }, []);

  // B3: фиксация явного акта согласия — сохраняем в localStorage и снимаем гейт.
  const grantAiConsent = () => {
    setAiConsent(true);
    try {
      localStorage.setItem(LS_AI_CONSENT, "1");
    } catch {
      /* ignore */
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    // B3: без явного согласия задача не уходит на сторонний AI-сервис.
    if (!aiConsent) return;
    setError(null);
    setInput("");
    const nextThread: Msg[] = [...thread, { role: "user", content: q }];
    setThread(nextThread);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true, messages: nextThread.slice(-10) }),
      });
      if (res.status === 429) {
        setError("Слишком много запросов. Подождите минуту и попробуйте снова.");
        return;
      }
      if (!res.ok) {
        setError("AI-сервис временно недоступен. Попробуйте чуть позже.");
        return;
      }
      const data = await res.json();
      setThread((t) => [...t, { role: "assistant", content: String(data.reply ?? "") }]);
    } catch {
      setError("Не удалось связаться с сервисом. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  };

  // Карточки «готовые команды» шлют событие demo:ask с текстом задачи → демо
  // автозаполняется и отправляет. Держим ссылку на актуальный send через ref,
  // чтобы слушатель не захватывал устаревшее замыкание (thread/loading).
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") sendRef.current(detail);
    };
    window.addEventListener("demo:ask", handler);
    return () => window.removeEventListener("demo:ask", handler);
  }, []);

  return (
    <section id="live-demo" className="py-14 sm:py-20 md:py-28 relative overflow-hidden bg-navy-900">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyber-purple/[0.06] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/60" />
              <span className="text-base md:text-xl font-heading font-bold uppercase tracking-[0.18em] text-gold">
                Живое демо
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/60" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Не верьте на слово — <span className="text-gradient-gold">спросите сами</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">
              Задайте юридическую задачу прямо сейчас. Это тот же AI, которого вы научитесь
              применять на курсе.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={100}>
          <div className="relative dossier-card border border-gold/25 rounded-xl overflow-hidden shadow-[0_18px_60px_-15px_rgba(0,0,0,0.7)]">
            <span className="hud-corner-tl" />
            <span className="hud-corner-br" />

            {/* Строка-заголовок «консоли» */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-purple/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-gold/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="ml-2 text-[11px] font-mono uppercase tracking-widest text-gray-500">
                AI Legal · демо-консоль
              </span>
            </div>

            {/* Область диалога */}
            <div ref={scrollRef} className="max-h-[340px] min-h-[180px] overflow-y-auto p-5 space-y-4">
              {/* B3 (152-ФЗ, ст.12): явное согласие на передачу задачи стороннему
                  AI-сервису перед первым запросом. До согласия — пресеты скрыты, гейт активен. */}
              {thread.length === 0 && !loading && !aiConsent && (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-xs max-w-[420px] mx-auto leading-relaxed text-left bg-white/[0.03] border border-white/10 rounded-lg p-4">
                    Сообщения в демо-чате обрабатываются сторонним AI-сервисом, возможна
                    трансграничная передача данных. Не вводите персональные данные, охраняемую
                    законом тайну и конфиденциальную информацию.
                  </p>
                  <button
                    onClick={grantAiConsent}
                    className="mt-4 px-6 py-2.5 bg-gold text-navy-900 font-heading font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-gold-light transition-colors cursor-pointer"
                  >
                    Понимаю, продолжить
                  </button>
                </div>
              )}

              {thread.length === 0 && !loading && aiConsent && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-5">
                    Выберите пример или введите свою задачу 👇
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-left text-xs text-gray-300 bg-white/[0.03] border border-white/10 hover:border-gold/40 hover:text-gold px-3 py-2 rounded-lg transition-colors max-w-[260px] cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {thread.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-gold/15 border border-gold/25 text-white rounded-br-sm"
                        : "bg-navy-800 border border-white/10 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-navy-800 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="flex items-center justify-center gap-1.5 text-center text-cyber-purple text-sm">
                  <span aria-hidden>⚠</span>
                  <span>
                    <span className="font-semibold">Ошибка: </span>
                    {error}
                  </span>
                </p>
              )}
            </div>

            {/* Ввод */}
            <div className="border-t border-white/10 p-3 bg-white/[0.02]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <label htmlFor="demo-task-input" className="sr-only">
                  Юридическая задача
                </label>
                <textarea
                  id="demo-task-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={aiConsent ? "Введите юридическую задачу…" : "Подтвердите согласие выше…"}
                  // B3: ввод и отправка заблокированы до явного согласия на AI-обработку.
                  disabled={!aiConsent}
                  className="flex-1 resize-none bg-navy-900 border border-white/10 focus:border-gold/40 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-400 outline-none max-h-32 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !aiConsent}
                  className="shrink-0 px-5 py-3 bg-gold text-navy-900 font-heading font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Спросить
                </button>
              </form>
              <p className="text-[11px] text-gray-400 mt-2 px-1 leading-snug">
                Сообщения обрабатываются сторонним AI-сервисом. Не вводите персональные данные и
                реальные реквизиты дел.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
