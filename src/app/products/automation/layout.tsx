import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Автоматизация юрфирмы с ИИ",
  description:
    "Аудит, стратегия, внедрение и поддержка AI-инструментов в вашей юридической практике под ключ. B2B-формат для юрфирм. От 200 000 ₽.",
  alternates: { canonical: "/products/automation" },
};

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
