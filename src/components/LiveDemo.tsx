"use client";

import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import ScrollReveal from "./ScrollReveal";
import FontShuffleWordmark from "./FontShuffleWordmark";

// FILE: src/components/LiveDemo.tsx
// VERSION: 3.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Живое демо AI-юриста — механика «Реформулировка» (идея reframed.online:
//   вход → выход). Человек описывает ситуацию своими словами («ситуация»), а AI на
//   глазах превращает её в структуру («разбор»: суть, риски, нормы, план). Сам переход
//   и есть демонстрация обещания курса — AI превращает юридический хаос в ясность.
// LANGUAGE: эстетика malvah.co/reframed.online — Helvetica Neue, near-black фон,
//   off-white текст #e6e6e6, БЕЗ капса/разрядки/неона. Ответ типографски свёрстан
//   (markdown → JSX), «звёздочки» больше не показываются.
// SCOPE: секция #live-demo на главной. Дёргает тот же /api/chat (demo:true).
// KEYWORDS: DOMAIN(7): UX; CONCEPT(9): Reframe+EditorialTypeset; TECH(8): React, md→JSX
// END_MODULE_CONTRACT
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v3.0.0 - Переписано под механику «Реформулировка» + malvah-язык +
//   безопасный md→JSX рендер (убраны звёздочки) + поэтапное проявление разбора]
// PREV_CHANGE_SUMMARY: [v2.x - HUD-консоль «досье» с сырым текстом (звёздочки) и gold-кнопкой]
// END_CHANGE_SUMMARY

// Нейтральный гротеск как на malvah/reframed (не Space Grotesk).
const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Реальные «боли» так, как их формулирует живой человек — вход в реформулировку.
const PRESETS = [
  "Пришла претензия на 500 000 ₽ за качество товара — что делать?",
  "Контрагент не платит уже три месяца — как взыскать долг?",
  "Прислали договор аренды на подпись — какие риски для меня?",
  "Хочу проверить контрагента перед сделкой — с чего начать?",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// B3 (152-ФЗ, ст.12): общий с виджетом Маняши ключ явного согласия на передачу текста
// стороннему AI-сервису. Согласие, данное в одном месте, действует и здесь.
const LS_AI_CONSENT = "ai-chat-consent";

// ── Мини-рендер markdown → JSX (без зависимостей) ───────────────────────────────
// Убирает «звёздочки»: заголовки, списки, **жирный**, ссылки на нормы РФ. Строим JSX
// (не innerHTML) — безопасно по XSS. Ссылки на нормы деликатно подчёркиваются одним
// сдержанным акцентом (единственный цвет на весь блок).
const NORM_SPLIT =
  /((?:ст\.?|Стать[а-я]+)\s?\d+(?:\.\d+)?\s?(?:ГК|ГПК|АПК|УК|КоАП|НК|ТК|ЖК|СК)\s?РФ|\d+-ФЗ)/g;
const NORM_TEST =
  /^(?:(?:ст\.?|Стать[а-я]+)\s?\d+(?:\.\d+)?\s?(?:ГК|ГПК|АПК|УК|КоАП|НК|ТК|ЖК|СК)\s?РФ|\d+-ФЗ)$/;

function withNorms(text: string, kp: string): ReactNode[] {
  return text.split(NORM_SPLIT).map((p, i) =>
    NORM_TEST.test(p) ? (
      <span
        key={kp + "n" + i}
        className="text-[#f4f2ec] underline decoration-cyber-blue/45 decoration-1 underline-offset-2 whitespace-nowrap"
      >
        {p}
      </span>
    ) : (
      <span key={kp + "t" + i}>{p}</span>
    ),
  );
}

function renderInline(text: string, kp: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).forEach((seg, i) => {
    if (/^\*\*[^*]+\*\*$/.test(seg)) {
      out.push(
        <strong key={kp + "b" + i} style={{ fontWeight: 500 }} className="text-[#f4f2ec]">
          {withNorms(seg.slice(2, -2), kp + "b" + i)}
        </strong>,
      );
    } else if (/^\*[^*]+\*$/.test(seg)) {
      out.push(
        <span key={kp + "i" + i} className="text-[#e6e6e6]/50">
          {seg.slice(1, -1)}
        </span>,
      );
    } else if (seg) {
      out.push(...withNorms(seg, kp + "s" + i));
    }
  });
  return out;
}

function renderAnswer(md: string, animate: boolean): ReactNode[] {
  const lines = md.split("\n");
  const blocks: ReactNode[] = [];
  let list: { t: string; ord: boolean; n: number }[] = [];
  let ordN = 0; // сквозная нумерация пунктов внутри раздела (сброс на каждом заголовке)
  let b = 0;

  const anim = (i: number): { className: string; style: CSSProperties } =>
    animate
      ? { className: "animate-module-item", style: { animationDelay: `${i * 70}ms` } }
      : { className: "", style: {} };

  const flush = () => {
    if (!list.length) return;
    const items = list;
    const idx = b++;
    const a = anim(idx);
    blocks.push(
      <ul key={"l" + idx} className={`space-y-2.5 my-3 ${a.className || ""}`} style={a.style}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 select-none pt-[3px] text-[13px] tabular-nums text-[#e6e6e6]/30">
              {it.ord ? String(it.n).padStart(2, "0") : "—"}
            </span>
            <span className="flex-1 text-[15px] leading-[1.65] text-[#e6e6e6]/85">
              {renderInline(it.t, `l${idx}i${i}`)}
            </span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw) => {
    const ln = raw.trim();
    if (!ln) {
      flush();
      return;
    }
    const num = ln.match(/^(\d+)[.)]\s+(.*)$/);
    const bul = ln.match(/^[-–—•]\s+(.*)$/);
    if (num) {
      ordN += 1;
      list.push({ t: num[2], ord: true, n: ordN });
      return;
    }
    if (bul) {
      list.push({ t: bul[1], ord: false, n: 0 });
      return;
    }
    flush();
    const idx = b++;
    const a = anim(idx);
    if (ln.startsWith("### ") || ln.startsWith("## ") || ln.startsWith("# ")) {
      ordN = 0;
      const t = ln.replace(/^#{1,3}\s+/, "");
      blocks.push(
        <div
          key={"h" + idx}
          className={`text-[#f4f2ec] text-[17px] md:text-[18px] leading-snug mt-5 mb-1 ${a.className || ""}`}
          style={a.style}
        >
          {renderInline(t, "h" + idx)}
        </div>,
      );
    } else if (/^\*[^*].*\*$/.test(ln)) {
      // Строка целиком курсивом → дисклеймер-сноска.
      blocks.push(
        <p
          key={"f" + idx}
          className={`text-[13px] leading-relaxed text-[#e6e6e6]/40 border-l border-white/15 pl-3 mt-5 ${a.className || ""}`}
          style={a.style}
        >
          {ln.replace(/^\*|\*$/g, "")}
        </p>,
      );
    } else {
      blocks.push(
        <p
          key={"p" + idx}
          className={`text-[15px] leading-[1.7] text-[#e6e6e6]/85 max-w-[64ch] my-2 ${a.className || ""}`}
          style={a.style}
        >
          {renderInline(ln, "p" + idx)}
        </p>,
      );
    }
  });
  flush();
  return blocks;
}

export default function LiveDemo({ embedded = false }: { embedded?: boolean }) {
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Пользователь печатает в чате → драйвит перебор шрифтов в вордмарке (только здесь).
  const [typing, setTyping] = useState(false);
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

  // Карточки «готовые команды» шлют событие demo:ask → демо автозаполняется и отправляет.
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

  const lastAssistant = thread.map((m) => m.role).lastIndexOf("assistant");

  // В embedded-режиме (горизонтальная секция) ScrollReveal отключаем: панель «въезжает»
  // трансформом, а не вертикальным скроллом, и IntersectionObserver ненадёжно триггерит —
  // контент рисковал остаться скрытым (opacity:0). Показываем сразу.
  const Reveal = ({
    children,
    direction,
    delay,
  }: {
    children: ReactNode;
    direction?: "up" | "left" | "right" | "fade";
    delay?: number;
  }) =>
    embedded ? (
      <>{children}</>
    ) : (
      <ScrollReveal direction={direction} delay={delay}>
        {children}
      </ScrollReveal>
    );

  const content = (
    <div className="max-w-6xl mx-auto w-full px-6 grid gap-8 lg:grid-cols-[42%_1fr] lg:gap-14 items-center">
      {/* ЛЕВО: живой типографический вордмарк AI. LEGAL (десктоп) — оживает при вводе */}
      <div className="hidden lg:block">
        <FontShuffleWordmark active={typing} />
      </div>

      {/* ПРАВО: чат */}
      <div className="w-full min-w-0">
        <Reveal direction="up">
          <div className="mb-5">
            <p className="text-[13px] text-[#e6e6e6]/40 mb-2">живое демо · не верьте на слово</p>
            <p className="text-[15px] md:text-[16px] leading-relaxed text-[#e6e6e6]/55 max-w-md">
              Опишите ситуацию своими словами — AI на глазах превратит хаос в структуру:
              суть, риски, нормы, план.
            </p>
          </div>
        </Reveal>

        <Reveal direction="up" delay={100}>
          <div className="border border-cyber-blue/15 rounded-2xl bg-[#0b0f16] overflow-hidden shadow-[0_0_50px_-18px_rgba(0,207,255,0.18)]">
            {/* Тихая строка-заголовок: без «окошек» и REC — только подпись и разворот. */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <span className="text-[13px] text-[#e6e6e6]/40">AI-юрист · демо</span>
              {thread.length > 0 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[13px] text-[#e6e6e6]/45 hover:text-[#e6e6e6] transition-colors cursor-pointer"
                >
                  {expanded ? "свернуть" : "развернуть"}
                </button>
              )}
            </div>

            {/* Область диалога */}
            <div
              ref={scrollRef}
              className={`overflow-y-auto px-5 md:px-7 py-6 transition-[max-height] duration-500 ${
                expanded
                  ? embedded
                    ? "max-h-[56vh]" // embedded: помещается в панель, не режется навбаром
                    : "max-h-[72vh]"
                  : embedded
                    ? "max-h-[38vh]"
                    : "max-h-[400px]"
              } ${thread.length === 0 && !loading ? "min-h-0" : "min-h-[200px]"}`}
            >
              {/* B3 (152-ФЗ, ст.12): явное согласие перед первым запросом. */}
              {thread.length === 0 && !loading && !aiConsent && (
                <div className="py-4">
                  <p className="text-[14px] leading-relaxed text-[#e6e6e6]/55 max-w-[440px]">
                    Сообщения в демо обрабатываются сторонним AI-сервисом, возможна
                    трансграничная передача данных. Не вводите персональные данные, охраняемую
                    законом тайну и конфиденциальную информацию.
                  </p>
                  <button
                    onClick={grantAiConsent}
                    className="mt-4 text-[15px] text-[#e6e6e6] underline underline-offset-4 decoration-[#e6e6e6]/30 hover:decoration-[#e6e6e6] transition-all cursor-pointer"
                  >
                    Понимаю, продолжить →
                  </button>
                </div>
              )}

              {thread.length === 0 && !loading && aiConsent && (
                <div className="py-2">
                  <p className="text-[14px] text-[#e6e6e6]/45 mb-4">
                    С чего начнём? Возьмите пример или опишите свою ситуацию 👇
                  </p>
                  <div className="flex flex-col gap-2 items-start">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-left text-[15px] leading-snug text-[#e6e6e6]/70 hover:text-[#e6e6e6] transition-colors cursor-pointer"
                      >
                        <span className="text-[#e6e6e6]/30 mr-2">→</span>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Пары «ситуация → разбор»: сам переход и есть реформулировка. */}
              <div className="space-y-7">
                {thread.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i}>
                      <p className="text-[12px] text-[#e6e6e6]/35 mb-1.5">ситуация</p>
                      <p className="text-[16px] leading-relaxed text-[#e6e6e6]/60">{m.content}</p>
                    </div>
                  ) : (
                    <div key={i}>
                      <p className="text-[12px] text-[#e6e6e6]/35 mb-2.5">разбор</p>
                      <div>{renderAnswer(m.content, i === lastAssistant)}</div>
                    </div>
                  ),
                )}
              </div>

              {loading && (
                <div className="mt-6">
                  <p className="text-[12px] text-[#e6e6e6]/35 mb-2">разбор</p>
                  <p className="flex items-center gap-1 text-[14px] text-[#e6e6e6]/45">
                    AI структурирует ответ
                    <span className="inline-flex gap-1 ml-1">
                      <span className="w-1 h-1 rounded-full bg-[#e6e6e6]/60 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 rounded-full bg-[#e6e6e6]/60 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 rounded-full bg-[#e6e6e6]/60 animate-bounce" />
                    </span>
                  </p>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 text-[14px] text-cyber-blue">
                  {error}
                </p>
              )}
            </div>

            {/* Ввод «как есть» */}
            <div className="border-t border-white/[0.07] px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-3"
              >
                <label htmlFor="demo-task-input" className="sr-only">
                  Ваша ситуация
                </label>
                <textarea
                  id="demo-task-input"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setTyping(true); // печатает → оживить перебор шрифтов в вордмарке
                  }}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  onKeyDown={(e) => {
                    setTyping(true);
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={
                    aiConsent
                      ? "Опишите ситуацию своими словами…"
                      : "Подтвердите согласие выше…"
                  }
                  disabled={!aiConsent}
                  className="flex-1 resize-none bg-transparent border-0 px-1 py-2.5 text-[15px] text-[#e6e6e6] placeholder:text-[#e6e6e6]/30 outline-none max-h-32 disabled:opacity-40"
                  style={{ fontFamily: HELV }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !aiConsent}
                  className="shrink-0 text-[15px] text-[#e6e6e6] border-b border-[#e6e6e6]/30 hover:border-[#e6e6e6] pb-1 transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                >
                  Разобрать →
                </button>
              </form>
            </div>
          </div>
        </Reveal>

        <p className="text-[12px] text-[#e6e6e6]/30 mt-3 px-1">
          Сообщения обрабатываются сторонним AI-сервисом. Не вводите персональные данные и
          реальные реквизиты дел.
        </p>
      </div>
    </div>
  );

  // Встраиваемый режим (внутри горизонтальной секции «Готовые команды → чат»):
  // без внешней <section> и вертикальных отступов — заполняет панель по центру.
  if (embedded) {
    return (
      <div
        id="live-demo"
        className="flex h-full w-full flex-col justify-center text-[#e6e6e6]"
        style={{ fontFamily: HELV }}
      >
        {content}
      </div>
    );
  }

  return (
    <section
      id="live-demo"
      className="py-16 sm:py-24 md:py-32 bg-[#070a10] text-[#e6e6e6]"
      style={{ fontFamily: HELV }}
    >
      {content}
    </section>
  );
}
