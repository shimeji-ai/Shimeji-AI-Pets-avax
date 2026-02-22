import type { Metadata } from "next";
import { SiteShimejiLandingSection } from "@/components/site-shimeji-landing-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { FeaturesSection } from "@/components/features-section";
// import { CtaSection } from "@/components/cta-section";
import { SubscribeSection } from "@/components/subscribe-section";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Shimeji AI Pets on Stellar | Home",
  description:
    "Explore Shimeji AI Pets on Stellar: animated companions, AI chat setup guides, and on-chain experiences.",
  path: "/",
});

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <SiteShimejiLandingSection />
      <div className="bg-transparent">
        <FeaturesSection />
        <HowItWorksSection />
        <SubscribeSection />
        {/* <CtaSection /> */}
      </div>
      <Footer />
    </main>
  );
}
