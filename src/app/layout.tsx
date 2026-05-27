import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import ScrollProgress from "@/components/ScrollProgress";
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
  title: "Нейросети для юристов | AI Legal — курс от экспертов",
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
  ],
  openGraph: {
    title: "Нейросети для юристов | AI Legal",
    description: "Практический курс от экспертов-юристов. Работайте быстрее конкурентов с помощью AI.",
    type: "website",
    locale: "ru_RU",
    siteName: "AI Legal",
  },
  twitter: {
    card: "summary_large_image",
    title: "Нейросети для юристов | AI Legal",
    description: "Практический курс от экспертов-юристов. Работайте быстрее конкурентов с помощью AI.",
  },
  robots: {
    index: true,
    follow: true,
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
      </head>
      <body className="antialiased selection:bg-gold selection:text-navy-900">
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
