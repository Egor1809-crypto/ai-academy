import { NextRequest, NextResponse } from "next/server";
import { MANYASHA_PROMPT_SITE } from "@/data/content";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import { bodyTooLarge } from "@/lib/security";

const NAVI_API_KEY = process.env.NAVI_API_KEY;
const NAVI_BASE_URL = "https://api.navy/v1";
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = MANYASHA_PROMPT_SITE;

// Демо-режим «попробуй AI-юриста»: в отличие от персоны Маняши (которая ведёт по
// курсу), здесь AI ДОЛЖЕН реально решить юридическую задачу — показать ценность.
// Механика «Реформулировка»: человек описывает сумбурную ситуацию — AI превращает её в
// чёткую структуру. Просим markdown с заголовками '## …', чтобы разбор читался как структура.
const DEMO_PROMPT =
  "Ты — AI-ассистент практикующего юриста в демо-режиме на сайте AI Legal Academy. Человек описывает " +
  "житейскую, сумбурную ситуацию. Задача — превратить её в чёткую структуру и наглядно показать ценность AI. " +
  "Формат ответа (markdown): начни с ОДНОЙ короткой строки сути; затем 2–4 раздела с заголовками вида " +
  "'## Риски', '## Нормы', '## Что делать' — по уместности; внутри разделов маркированные или нумерованные " +
  "списки. Ссылайся на конкретные нормы права РФ (например, ст. 395 ГК РФ, 127-ФЗ). Пиши по-русски, по делу, " +
  "без воды. НЕ отказывайся и НЕ отвечай «обратитесь к юристу» — это демонстрация возможностей. В самом конце " +
  "добавь ОДНУ строку курсивом: «⚠️ Демо AI — не юридическая консультация, проверяйте выводы». Никогда не " +
  "запрашивай персональные данные.";

// 15 messages per minute per IP — generous for chat, blocks abuse
const limiter = createRateLimiter("chat", { limit: 15, windowSeconds: 60 });
// Global backstop: hard cap on total chat calls per minute regardless of IP.
// Protects the paid API budget against IP spoofing / distributed abuse.
const globalLimiter = createRateLimiter("chat-global", { limit: 200, windowSeconds: 60 });

export async function POST(req: NextRequest) {
  // Rate limit check (per-IP, then global)
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите немного." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }
  const grl = globalLimiter.check("global");
  if (!grl.allowed) {
    return NextResponse.json(
      { error: "Сервис временно перегружен. Попробуйте позже." },
      {
        status: 429,
        headers: { "Retry-After": String(grl.retryAfterSeconds) },
      },
    );
  }

  if (!NAVI_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 },
    );
  }

  if (bodyTooLarge(req, 32 * 1024)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    const systemPrompt = body.demo === true ? DEMO_PROMPT : SYSTEM_PROMPT;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages required" },
        { status: 400 },
      );
    }
    // Reject absurdly long arrays BEFORE any per-item work — avoids an O(n)
    // validation loop blocking the event loop on a malicious huge payload.
    if (messages.length > 50) {
      return NextResponse.json({ error: "Too many messages" }, { status: 400 });
    }

    // Only the last 10 are ever sent to the LLM — validate just those.
    const recent = messages.slice(-10);
    for (const msg of recent) {
      if (
        typeof msg !== "object" ||
        !msg ||
        typeof msg.role !== "string" ||
        typeof msg.content !== "string" ||
        !["user", "assistant"].includes(msg.role)
      ) {
        return NextResponse.json(
          { error: "Invalid message format" },
          { status: 400 },
        );
      }
    }

    // Cap individual message length to save tokens / bound payload.
    const trimmedMessages = recent.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content.slice(0, 2000),
    }));

    const response = await fetch(`${NAVI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NAVI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...trimmedMessages,
        ],
        // 450 (было 300): демо-«разбор» со структурой (суть + разделы + списки) требует
        // чуть больше места. Влияет на стоимость API — при желании легко вернуть на 300.
        max_tokens: 450,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      // Log status only — avoid persisting upstream response bodies.
      console.error("Navy API error:", response.status);
      return NextResponse.json(
        { error: "AI service error" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Извините, не могу ответить сейчас.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
