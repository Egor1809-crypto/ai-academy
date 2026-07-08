import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Практикум «AI-Lab»: нейросети для юристов на практике",
  description:
    "Двухдневный воркшоп AI-Lab в малых группах до 15 человек: решаете свои реальные юридические кейсы с нейросетями. Ноутбуки с AI-инструментами, сертификат AI Legal. От 35 000 ₽.",
  alternates: { canonical: "/products/workshop" },
};

export default function WorkshopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
