import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import ScrollProgress from "@/components/ScrollProgress";
import ManyashaChat from "@/components/ManyashaChat";
import JsonLd from "@/components/JsonLd";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ailegal.ru"),
  title: {
    default: "Нейросети для юристов | AI Legal — курс от экспертов",
    template: "%s | AI Legal",
  },
  description:
    "Практический курс по AI для юристов. ChatGPT, Claude, Midjourney — промпты и методики для юридической практики. Анализ договоров за 5 минут, генерация исков, Legal Design.",
  keywords: [
    "нейросети для юристов",
    "AI для юристов",
    "курс по нейросетям",
    "ChatGPT для юристов",
    "Claude для юристов",
    "LegalTech",
    "Legal Design",
    "автоматизация юридической работы",
    "промпты для юристов",
    "искусственный интеллект юриспруденция",
    "AI Legal Academy",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Нейросети для юристов | AI Legal",
    description:
      "Практический курс от экспертов-юристов. Работайте быстрее конкурентов с помощью AI.",
    type: "website",
    locale: "ru_RU",
    siteName: "AI Legal",
    url: "https://ailegal.ru",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Legal — Нейросети для юристов",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Нейросети для юристов | AI Legal",
    description:
      "Практический курс от экспертов-юристов. Работайте быстрее конкурентов с помощью AI.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Yandex Webmaster — добавить токен после регистрации
    // yandex: "ваш_токен",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`scroll-smooth ${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" />
        <JsonLd />
      </head>
      <body className="antialiased selection:bg-gold selection:text-navy-900">
        <ScrollProgress />
        {children}
        <ManyashaChat />
      </body>
    </html>
  );
}
