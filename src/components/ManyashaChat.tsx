"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTTS } from "@/hooks/useTTS";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = ["Расскажи о курсе", "Какие тарифы?", "Кто преподаёт?"];
const TELEGRAM_BOT = "https://t.me/ailegal_academy_bot";

// Маняшу можно увеличивать самому — три размера по кругу.
const SIZES = [180, 260, 360];
const DRAG_THRESHOLD = 6; // px — отличаем «клик» (открыть чат) от «перетащить»

// Размеры окна чата (пользователь может менять, значения запоминаются)
const CHAT_DEFAULT = { w: 360, h: 460 };
const CHAT_MIN = { w: 300, h: 320 };
const CHAT_MAX = { w: 560, h: 680 };

// Ключи для запоминания состояния между страницами
const LS_POS = "manyasha.pos";
const LS_SIZE = "manyasha.sizeIdx";
const LS_CHAT = "manyasha.chat";

export default function ManyashaChat() {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [chatSize, setChatSize] = useState(CHAT_DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });
  const resizeState = useRef({ startX: 0, startY: 0, baseW: 0, baseH: 0 });

  // Виджет-маскот не показываем на главной (там Маняша в Hero) и в личном
  // кабинете (там деловой интерфейс — матрёшка отвлекает).
  const hideWidget = pathname === "/" || pathname.startsWith("/cabinet");
  const { speak } = useTTS();

  const mascotWidth = SIZES[sizeIdx];
  // Чат «приклеен» к Маняше — небольшой зазор над её головой.
  const chatBottom = Math.round(mascotWidth * 0.62) + 8;

  // ── Загрузка сохранённого состояния (один раз) ──
  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_POS);
      if (p) {
        const parsed = JSON.parse(p);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") setPos(parsed);
      }
      const s = localStorage.getItem(LS_SIZE);
      if (s !== null) {
        const idx = Number(s);
        if (idx >= 0 && idx < SIZES.length) setSizeIdx(idx);
      }
      const c = localStorage.getItem(LS_CHAT);
      if (c) {
        const parsed = JSON.parse(c);
        if (typeof parsed.w === "number" && typeof parsed.h === "number") setChatSize(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // ── Сохранение состояния ──
  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_POS, JSON.stringify(pos));
  }, [pos, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_SIZE, String(sizeIdx));
  }, [sizeIdx, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_CHAT, JSON.stringify(chatSize));
  }, [chatSize, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  const sendChatMessage = useCallback(
    async (text: string, currentMessages: ChatMessage[]) => {
      if (!text || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text };
      const newMessages = [...currentMessages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        const data = await res.json();
        const reply = data.reply ?? "Извините, произошла ошибка.";

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        speak(reply);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Не могу подключиться к серверу. Попробуйте позже." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, speak],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (text) sendChatMessage(text, messages);
  }, [input, messages, sendChatMessage]);

  const handleQuickQuestion = useCallback(
    (q: string) => {
      sendChatMessage(q, messages);
    },
    [messages, sendChatMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cycleSize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSizeIdx((i) => (i + 1) % SIZES.length);
  }, []);

  // ── Перетаскивание Маняши (зажал и тащишь) ──
  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    st.moved = true;
    setDragging(true);

    let nextX = st.baseX + dx;
    let nextY = st.baseY + dy;
    const margin = 12;
    const minX = -(window.innerWidth - mascotWidth - margin);
    const minY = -(window.innerHeight - mascotWidth - margin);
    nextX = Math.min(margin, Math.max(minX, nextX));
    nextY = Math.min(margin, Math.max(minY, nextY));
    setPos({ x: nextX, y: nextY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const st = dragState.current;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!st.moved) {
      setChatOpen((prev) => !prev);
    }
    setDragging(false);
  };

  // ── Изменение размера окна чата мышью (ручка в верхнем-левом углу) ──
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseW: chatSize.w,
      baseH: chatSize.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const st = resizeState.current;
    // Окно «растёт» влево и вверх, поэтому вычитаем смещение.
    const w = Math.min(CHAT_MAX.w, Math.max(CHAT_MIN.w, st.baseW - (e.clientX - st.startX)));
    const h = Math.min(CHAT_MAX.h, Math.max(CHAT_MIN.h, st.baseH - (e.clientY - st.startY)));
    setChatSize({ w, h });
  };
  const onResizeUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Don't show on home page — hero already has the mascot
  if (hideWidget) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Chat window */}
      {chatOpen && (
        <div
          className="absolute right-0 bg-gradient-to-b from-navy-800/98 to-navy-900/98 border border-gold/25 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-fadeIn"
          style={{ bottom: chatBottom, width: chatSize.w, height: chatSize.h }}
        >
          {/* Resize handle (верхний левый угол) */}
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            className="absolute top-0 left-0 w-6 h-6 z-20 cursor-nwse-resize flex items-center justify-center text-gold/50 hover:text-gold"
            title="Потяните, чтобы изменить размер окна"
          >
            <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11 7v4m0 0h-4m4 0l-5-5" />
            </svg>
          </div>

          {/* Header */}
          <div className="relative flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-600/30 via-cyber-purple/20 to-gold/15 border-b border-white/10 shrink-0">
            <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />
            <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-gold/40 shadow-lg shrink-0 bg-navy-900 ml-3">
              <img
                src="/mascot/manyasha-avatar.jpg"
                alt="Маняша"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Маняша</p>
              <p className="text-[11px] text-cyan-300/90 font-medium flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                </span>
                AI-помощник · онлайн
              </p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="relative w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/15 rounded-full transition-colors cursor-pointer shrink-0"
              aria-label="Закрыть чат"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden ring-2 ring-gold/30 bg-navy-900">
                  <img
                    src="/mascot/manyasha-avatar.jpg"
                    alt="Маняша"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <p className="text-white text-sm font-semibold">Привет! Я Маняша 👋</p>
                <p className="text-gray-400 text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  Помогу разобраться с курсом, программой и тарифами. Спрашивайте!
                </p>
                <p className="text-gray-500 text-[10px] mt-2 max-w-[250px] mx-auto leading-relaxed">
                  Сообщения обрабатываются сторонним AI-сервисом. Не вводите персональные данные
                  и конфиденциальную информацию.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3.5 py-2 text-xs bg-white/5 border border-white/10 text-gray-200 rounded-full hover:border-gold/50 hover:bg-gold/10 hover:text-gold transition-all cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-gold/30 bg-navy-900 shrink-0">
                    <img
                      src="/mascot/manyasha-avatar.jpg"
                      alt=""
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-gold/30 to-gold/15 text-gold-100 rounded-2xl rounded-br-md border border-gold/20"
                      : "bg-white/[0.07] text-gray-100 rounded-2xl rounded-bl-md border border-white/5"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-gold/30 bg-navy-900 shrink-0">
                  <img
                    src="/mascot/manyasha-avatar.jpg"
                    alt=""
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="bg-white/[0.07] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-300/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-cyan-300/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-cyan-300/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 bg-navy-900/40 shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:bg-white/[0.08] transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gold to-cyber-purple text-white rounded-full hover:shadow-[0_0_18px_rgba(245,197,24,0.5)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                aria-label="Отправить"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <a
              href={TELEGRAM_BOT}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-2.5 py-1.5 text-[11px] text-gray-400 hover:text-blue-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Продолжить в Telegram
            </a>
          </div>
        </div>
      )}

      {/* Mascot — клик открывает чат, зажать и тащить = переместить, кнопка ⤢ меняет размер */}
      <div
        className="relative select-none"
        style={{ width: mascotWidth, touchAction: "none" }}
      >
        {/* Size control */}
        <button
          onClick={cycleSize}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 z-10 w-8 h-8 flex items-center justify-center bg-navy-800/90 border border-gold/30 text-gold rounded-full hover:bg-gold/20 transition-colors cursor-pointer shadow-lg"
          aria-label="Изменить размер Маняши"
          title="Изменить размер Маняши"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* Голограмма: свечение из-под серебряной панели */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[80%] h-[24%] pointer-events-none z-0">
          <div className="absolute inset-x-0 bottom-0 h-full bg-cyan-400/25 blur-2xl rounded-[50%]" />
          <div className="absolute inset-x-[20%] bottom-0 h-[160%] bg-gradient-to-t from-cyan-300/30 via-cyan-400/10 to-transparent blur-md" />
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`relative z-[1] transition-[filter] duration-300 ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } hover:drop-shadow-[0_0_24px_rgba(0,207,255,0.4)]`}
        >
          <video
            src="/mascot/manyasha-idle-alpha.webm"
            poster="/mascot/manyasha-idle-poster.jpg"
            loop
            muted
            playsInline
            autoPlay
            preload="auto"
            draggable={false}
            className="w-full h-auto pointer-events-none"
            style={{ background: "transparent" }}
          />
        </div>

        {!chatOpen && !dragging && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <div className="bg-navy-800/95 border border-gold/30 backdrop-blur-md px-3 py-2 text-xs text-gray-200 rounded-lg whitespace-nowrap">
              Нужна помощь?
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 bg-navy-800/95 border-r border-b border-gold/30 rotate-45" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
