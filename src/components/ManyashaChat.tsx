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

export default function ManyashaChat() {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHome = pathname === "/";
  const { speak } = useTTS();

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

  // Don't show on home page — hero already has the mascot
  if (isHome) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat window */}
      {chatOpen && (
        <div className="absolute bottom-[160px] right-0 w-[340px] max-h-[460px] bg-navy-800/95 border border-gold/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-navy-900/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm">
              🪆
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Маняша</p>
              <p className="text-[10px] text-green-400 font-mono">● онлайн</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Закрыть чат"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[320px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Привет! Я Маняша</p>
                <p className="text-gray-500 text-xs mt-1">
                  Спроси меня о курсе, программе или тарифах
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-gray-300 rounded-full hover:border-gold/40 hover:text-gold transition-all cursor-pointer"
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
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gold/20 text-gold-100 rounded-br-sm"
                      : "bg-white/5 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 px-4 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 bg-navy-900/30">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/40 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3 py-2.5 bg-gold/20 text-gold rounded-xl hover:bg-gold/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
              className="flex items-center justify-center gap-2 mt-2 py-1.5 text-[11px] text-gray-400 hover:text-blue-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Продолжить в Telegram
            </a>
          </div>
        </div>
      )}

      {/* Mascot button */}
      <div
        className="cursor-pointer transition-transform duration-300 hover:scale-110"
        onClick={() => setChatOpen((prev) => !prev)}
      >
        <div className="w-[180px]">
          <video
            src="/mascot/manyasha-idle-alpha.webm"
            poster="/mascot/manyasha-idle-poster.jpg"
            loop
            muted
            playsInline
            autoPlay
            preload="auto"
            className="w-full h-auto"
            style={{ background: "transparent" }}
          />
        </div>
        {!chatOpen && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full">
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
