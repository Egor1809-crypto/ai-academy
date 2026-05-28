import { NextRequest, NextResponse } from "next/server";
import { MANYASHA_PROMPT_SITE } from "@/data/content";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const NAVI_API_KEY = process.env.NAVI_API_KEY;
const NAVI_BASE_URL = "https://api.navy/v1";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = MANYASHA_PROMPT_SITE;

// 15 messages per minute per IP — generous for chat, blocks abuse
const limiter = createRateLimiter("chat", { limit: 15, windowSeconds: 60 });

export async function POST(req: NextRequest) {
  // Rate limit check
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

  if (!NAVI_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages required" },
        { status: 400 },
      );
    }

    // Validate message structure
    for (const msg of messages) {
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

    // Limit history to last 10 messages to save tokens
    const trimmedMessages = messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content.slice(0, 2000), // cap individual message length
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
          { role: "system", content: SYSTEM_PROMPT },
          ...trimmedMessages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Navy API error:", response.status, err);
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
