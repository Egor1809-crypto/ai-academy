import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";
import Tariffs from "@/components/Tariffs";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import TariffsHero from "./TariffsHero";

export const metadata = {
  title: "Тарифы | ИИ для юриста по банкротству",
  description: "Выберите подходящий тариф обучения AI Legal. Рассрочка 0%, возврат 13% через налоговый вычет, гарантия возврата 7 дней.",
};

export default function TariffsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <TariffsHero />
        <Tariffs />
        <FAQ />
        <CTA />
      </main>
      <FooterCompact />
    </>
  );
}
