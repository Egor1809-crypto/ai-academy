import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ru" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-gold selection:text-navy-900">
        {children}
      </body>
    </html>
  );
}
