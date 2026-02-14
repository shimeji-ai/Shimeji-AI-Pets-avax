import { HelpSection } from "@/components/help-section";
import { Footer } from "@/components/footer";
import { NavHeader } from "@/components/nav-header";

export default function HelpPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader />
      <HelpSection />
      <Footer />
    </main>
  );
}
