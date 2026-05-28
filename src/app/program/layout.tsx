import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Программа курса | AI Legal — Нейросети для юристов",
  description:
    "Подробная программа курса AI Legal: 4 модуля, 8 недель, 50+ часов практики. ChatGPT, Claude, Midjourney для юристов.",
};

export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return children;
}
