import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import TrustBadges from "@/components/TrustBadges";
import SectionDivider from "@/components/SectionDivider";
import WhyNow from "@/components/WhyNow";
import Manifesto from "@/components/Manifesto";
import Audience from "@/components/Audience";
import TimeSavingsCalc from "@/components/TimeSavingsCalc";
import UseCases from "@/components/UseCases";
import CommandDeck from "@/components/CommandDeck";
import Experts from "@/components/Experts";
import DataSecurity from "@/components/DataSecurity";
import Bonus from "@/components/Bonus";
import Tariffs from "@/components/Tariffs";
import Program from "@/components/Program";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import RevealFooter from "@/components/RevealFooter";
import FloatingTelegram from "@/components/FloatingTelegram";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Navbar />
      {/* RevealFooter: секции едут вверх и «открывают» футер (эффект как на malvah.co) */}
      <RevealFooter>
        <Hero />
        <FloatingTelegram />
        <Ticker />
        <TrustBadges />
        <SectionDivider />
        <WhyNow />
        <Manifesto />
        <Audience />
        <TimeSavingsCalc />
        <SectionDivider />
        <UseCases />
        <CommandDeck />
        <SectionDivider />
        <Experts />
        <DataSecurity />
        <Bonus />
        <SectionDivider />
        <Tariffs showComparison={false} />
        <Program />
        <SectionDivider />
        <Testimonials />
        <CTA />
      </RevealFooter>
    </>
  );
}
