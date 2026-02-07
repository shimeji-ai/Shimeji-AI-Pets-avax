import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { SetupSection } from "@/components/setup-section";
import { CharactersSection } from "@/components/characters-section";
import { FeaturesSection } from "@/components/features-section";
import { FAQSection } from "@/components/faq-section";
import { CtaSection } from "@/components/cta-section";
import { SubscribeSection } from "@/components/subscribe-section";
import { Footer } from "@/components/footer";
import { GiveawayWidget } from "@/components/giveaway-widget";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <Header />
      <GiveawayWidget />
      <HeroSection />
      <div className="bg-transparent">
        <HowItWorksSection />
        <SetupSection />
        {/* <CharactersSection /> */}
        <FeaturesSection />
        <SubscribeSection />
        <FAQSection />
        <CtaSection />
      </div>
      <Footer />
    </main>
  );
}
