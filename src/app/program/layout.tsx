import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Программа курса — ИИ для юриста по банкротству",
  description:
    "Программа курса AI Legal: 8 уроков БФЛ — от физики LLM до своего ИИ-конвейера. Урок 6 — практикум по банкротству: реестр, отзывы, оспаривание сделок 61.2–61.9.",
  alternates: { canonical: "/program" },
};

export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return children;
}
