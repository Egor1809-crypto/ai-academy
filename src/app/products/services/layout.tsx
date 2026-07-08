import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-услуги для юрфирм: промпты, аудит, интеграция",
  description:
    "Разработка промптов под задачи клиента, AI-аудит юридических процессов, интеграция нейросетей в CRM и документооборот, создание AI-ассистента для юрфирмы. От 50 000 ₽.",
  alternates: { canonical: "/products/services" },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
