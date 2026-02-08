import { Header } from "@/components/header";
import { HelpSection } from "@/components/help-section";
import { Footer } from "@/components/footer";

export default function HelpPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <Header />
      <HelpSection />
      <Footer />
    </main>
  );
}
