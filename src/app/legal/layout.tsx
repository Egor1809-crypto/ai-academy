import Navbar from "@/components/Navbar";
import FooterCompact from "@/components/FooterCompact";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen">{children}</main>
      <FooterCompact />
    </>
  );
}
