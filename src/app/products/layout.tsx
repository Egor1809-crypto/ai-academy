import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Продукты и услуги",
  description:
    "AI-курс, живые семинары, практикумы, автоматизация юрфирмы, корпоративное обучение — все продукты AI Legal Academy.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
