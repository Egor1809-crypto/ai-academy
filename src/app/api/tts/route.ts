import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const NAVI_API_KEY = process.env.NAVI_API_KEY;
const NAVI_BASE_URL = "https://api.navy/v1";

// TTS is expensive — 10 requests per minute per IP
const limiter = createRateLimiter("tts", { limit: 10, windowSeconds: 60 });

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
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // Limit text length
    const trimmed = text.slice(0, 500);

    const response = await fetch(`${NAVI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NAVI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: trimmed,
        voice: "nova",
        speed: 1.05,
      }),
    });

    if (!response.ok) {
      console.error("TTS API error:", response.status);
      return NextResponse.json({ error: "TTS service error" }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
