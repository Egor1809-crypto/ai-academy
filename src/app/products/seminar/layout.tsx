import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Живой семинар «AI-революция» для юристов",
  description:
    "Однодневный семинар-погружение «AI-революция» — первый в России живой формат по нейросетям для юристов. Теория, live-демо на реальных кейсах, практика и нетворкинг. От 15 000 ₽.",
  alternates: { canonical: "/products/seminar" },
};

export default function SeminarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
