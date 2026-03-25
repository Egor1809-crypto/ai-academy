import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Нейросети для юристов | AI Legal",
  description:
    "Промпты, разработанные специально для юридической практики — от дизайна до узкоспециализированных документов.",
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
