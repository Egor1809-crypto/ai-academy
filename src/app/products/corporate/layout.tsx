import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корпоративное обучение юристов работе с ИИ",
  description:
    "Выездной, онлайн или гибридный тренинг по нейросетям для юридических команд от 5 человек: pre-assessment, тренинг, post-support и сертификация. Программа под задачи компании.",
  alternates: { canonical: "/products/corporate" },
};

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
