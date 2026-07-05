import type { Metadata } from "next";
import { Space_Grotesk, Inter, Lora } from "next/font/google";
import { shuffleFontVars } from "@/lib/shuffleFonts";
import ScrollProgress from "@/components/ScrollProgress";
import ManyashaChat from "@/components/ManyashaChat";
import ParticlesInit from "@/components/ParticlesInit";
import JsonLd from "@/components/JsonLd";
import CookieConsent from "@/components/CookieConsent";
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

// Редакторский serif для «досье»-заголовков
const lora = Lora({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://expertum.pro"),
  title: {
    default: "ИИ для юриста по банкротству (БФЛ) | AI Legal",
    template: "%s | AI Legal",
  },
  description:
    "Первая в России система ИИ для юриста по банкротству (БФЛ). 8 уроков: реестр требований, отзывы, жалобы, оспаривание сделок 61.2–61.9, Федресурс/КАД — до внедрения своего ИИ-конвейера.",
  keywords: [
    "ИИ для юриста по банкротству",
    "нейросети для юриста БФЛ",
    "банкротство физлиц ИИ",
    "автоматизация банкротства",
    "реестр требований кредиторов",
    "оспаривание сделок должника",
    "арбитражный управляющий ИИ",
    "курс ИИ для юристов",
    "LegalTech банкротство",
    "AI Legal Academy",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ИИ для юриста по банкротству (БФЛ) | AI Legal",
    description:
      "Первая в России система ИИ для юриста по банкротству. Из хаоса инструментов — в рабочую систему под БФЛ.",
    type: "website",
    locale: "ru_RU",
    siteName: "AI Legal",
    url: "https://expertum.pro",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Legal — ИИ для юриста по банкротству",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ИИ для юриста по банкротству (БФЛ) | AI Legal",
    description:
      "Первая в России система ИИ для юриста по банкротству. Из хаоса инструментов — в рабочую систему под БФЛ.",
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
    <html lang="ru" className={`${spaceGrotesk.variable} ${inter.variable} ${lora.variable} ${shuffleFontVars}`}>
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" />
        <JsonLd />
      </head>
      <body className="antialiased selection:bg-gold selection:text-navy-900">
        <ParticlesInit>
          <ScrollProgress />
          {children}
          <ManyashaChat />
        </ParticlesInit>
        <CookieConsent />
      </body>
    </html>
  );
}
