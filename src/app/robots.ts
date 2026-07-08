import type { MetadataRoute } from "next";

const BASE_URL = "https://expertum.pro";

// Явно перечисленные краулеры AI-ассистентов и AI-поиска. Пускаем их на весь
// сайт — это основной рычаг GEO (Generative Engine Optimization): без доступа
// ChatGPT / Perplexity / Google AI / Яндекс не смогут цитировать и рекомендовать.
const AI_BOTS = [
  "GPTBot",            // OpenAI — обучение
  "OAI-SearchBot",     // OpenAI — поисковый индекс ChatGPT Search
  "ChatGPT-User",      // OpenAI — переходы по ссылкам из ответов
  "ClaudeBot",         // Anthropic — обучение/индекс
  "Claude-User",       // Anthropic — переходы из ответов
  "anthropic-ai",      // Anthropic (легаси-токен)
  "PerplexityBot",     // Perplexity — индекс
  "Perplexity-User",   // Perplexity — переходы из ответов
  "Google-Extended",   // Google — Gemini/AI Overviews
  "Applebot-Extended", // Apple Intelligence
  "Amazonbot",         // Amazon (Alexa/Rufus)
  "Bytespider",        // ByteDance/Doubao
  "CCBot",             // Common Crawl (питает многие LLM)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cabinet"],
      },
      {
        userAgent: AI_BOTS,
        allow: "/",
        disallow: ["/admin", "/api/", "/cabinet"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
