import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import TrustBadges from "@/components/TrustBadges";
import SectionDivider from "@/components/SectionDivider";
import WhyNow from "@/components/WhyNow";
import Audience from "@/components/Audience";
import UseCases from "@/components/UseCases";
import Experts from "@/components/Experts";
import Bonus from "@/components/Bonus";
import Tariffs from "@/components/Tariffs";
import Program from "@/components/Program";
import FAQ from "@/components/FAQ";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Ticker />
      <TrustBadges />
      <SectionDivider />
      <WhyNow />
      <Audience />
      <SectionDivider />
      <UseCases />
      <SectionDivider />
      <Experts />
      <Bonus />
      <SectionDivider />
      <Tariffs />
      <Program />
      <SectionDivider />
      <FAQ />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  );
}
